const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const Agent = require('../models/Agent');

class SecurityMonitor {
    constructor() {
        this.threatLevels = {
            LOW: 'Low',
            MEDIUM: 'Medium',
            HIGH: 'High'
        };
        
        this.suspiciousIPs = new Set();
        this.blacklistedIPs = new Set();
        this.activeAlerts = new Map();
        this.lastThreatAssessment = null;
        this.currentThreatLevel = this.threatLevels.LOW;
    }

    // Rate Limiting Configuration
    getRateLimiter() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // Limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again later.',
            handler: (req, res, next) => {
                this.logSecurityEvent({
                    type: 'RATE_LIMIT_EXCEEDED',
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    timestamp: new Date()
                });
                res.status(429).json({
                    error: 'Too many requests from this IP, please try again later.'
                });
            }
        });
    }

    // Analyze Login Attempt
    async analyzeLoginAttempt(req, username) {
        const ip = req.ip;
        const userAgent = req.headers['user-agent'];
        const geo = geoip.lookup(ip);
        const parser = new UAParser(userAgent);
        const deviceInfo = parser.getResult();

        const agent = await Agent.findOne({ username });
        if (!agent) return { risk: 'medium', reason: 'Unknown user' };

        const riskFactors = [];
        let riskLevel = 'low';

        // Check if IP is blacklisted
        if (this.blacklistedIPs.has(ip)) {
            return { risk: 'high', reason: 'IP is blacklisted' };
        }

        // Check for suspicious IP
        if (this.suspiciousIPs.has(ip)) {
            riskFactors.push('Suspicious IP address');
            riskLevel = 'medium';
        }

        // Geolocation anomaly detection
        if (agent.lastLoginGeo && geo) {
            const distance = this.calculateGeoDistance(
                agent.lastLoginGeo.lat,
                agent.lastLoginGeo.lon,
                geo.ll[0],
                geo.ll[1]
            );
            if (distance > 1000) { // More than 1000km
                riskFactors.push('Unusual login location');
                riskLevel = 'high';
            }
        }

        // Device fingerprint analysis
        const deviceFingerprint = this.generateDeviceFingerprint(deviceInfo);
        if (agent.knownDevices && !agent.knownDevices.includes(deviceFingerprint)) {
            riskFactors.push('Unknown device');
            riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
        }

        // Time-based analysis
        const hour = new Date().getHours();
        if (agent.usualLoginHours) {
            const isUnusualTime = !agent.usualLoginHours.includes(hour);
            if (isUnusualTime) {
                riskFactors.push('Unusual login time');
                riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
            }
        }

        return {
            risk: riskLevel,
            reasons: riskFactors,
            geo,
            deviceInfo
        };
    }

    // Monitor Session Activity
    async monitorSession(sessionId, userId) {
        const session = {
            id: sessionId,
            userId,
            startTime: new Date(),
            activityLog: [],
            riskScore: 0
        };

        // Monitor session activities
        return {
            logActivity: (activity) => {
                session.activityLog.push({
                    timestamp: new Date(),
                    activity,
                    riskDelta: this.calculateActivityRisk(activity)
                });
                this.updateSessionRisk(session);
            },
            getSessionHealth: () => {
                return {
                    duration: new Date() - session.startTime,
                    riskScore: session.riskScore,
                    activities: session.activityLog.length
                };
            },
            endSession: async () => {
                await this.logSessionEnd(session);
            }
        };
    }

    // Threat Assessment
    async assessThreatLevel() {
        const now = new Date();
        const last24Hours = new Date(now - 24 * 60 * 60 * 1000);

        const metrics = await Promise.all([
            Agent.countDocuments({ 'failedLogins.timestamp': { $gte: last24Hours } }),
            this.getActiveAlertCount(),
            this.getSuspiciousIPCount(),
            this.getAnomalyScore()
        ]);

        const [failedLogins, activeAlerts, suspiciousIPs, anomalyScore] = metrics;

        let threatScore = 0;
        threatScore += failedLogins * 0.3;
        threatScore += activeAlerts * 0.3;
        threatScore += suspiciousIPs * 0.2;
        threatScore += anomalyScore * 0.2;

        this.currentThreatLevel = this.calculateThreatLevel(threatScore);
        this.lastThreatAssessment = now;

        return {
            level: this.currentThreatLevel,
            score: threatScore,
            metrics: {
                failedLogins,
                activeAlerts,
                suspiciousIPs,
                anomalyScore
            },
            timestamp: now
        };
    }

    // Security Event Logging
    async logSecurityEvent(event) {
        const securityLog = {
            timestamp: new Date(),
            type: event.type,
            ip: event.ip,
            userAgent: event.userAgent,
            details: event.details || {},
            severity: this.calculateEventSeverity(event)
        };

        // Save to database and emit to admin dashboard
        await this.saveSecurityLog(securityLog);
        this.emitSecurityAlert(securityLog);

        // Update threat assessment if necessary
        if (this.shouldUpdateThreatLevel(securityLog)) {
            await this.assessThreatLevel();
        }

        return securityLog;
    }

    // Utility Methods
    calculateGeoDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                 Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                 Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRad(degrees) {
        return degrees * Math.PI / 180;
    }

    generateDeviceFingerprint(deviceInfo) {
        const components = [
            deviceInfo.browser.name,
            deviceInfo.browser.version,
            deviceInfo.os.name,
            deviceInfo.os.version,
            deviceInfo.device.vendor,
            deviceInfo.device.model,
            deviceInfo.device.type
        ];
        return crypto.createHash('sha256')
            .update(components.join('|'))
            .digest('hex');
    }

    calculateActivityRisk(activity) {
        // Risk calculation based on activity type
        const riskScores = {
            'password_change': 0.5,
            'role_change': 0.8,
            'settings_change': 0.3,
            'file_upload': 0.4,
            'bulk_operation': 0.6
        };
        return riskScores[activity.type] || 0.1;
    }

    updateSessionRisk(session) {
        const recentActivities = session.activityLog.slice(-10);
        const riskSum = recentActivities.reduce((sum, log) => sum + log.riskDelta, 0);
        session.riskScore = Math.min(1, riskSum / 10);
    }

    calculateThreatLevel(score) {
        if (score >= 7) return this.threatLevels.HIGH;
        if (score >= 4) return this.threatLevels.MEDIUM;
        return this.threatLevels.LOW;
    }

    calculateEventSeverity(event) {
        // Severity calculation based on event type and context
        const severityMap = {
            'BRUTE_FORCE_ATTEMPT': 'high',
            'SUSPICIOUS_IP': 'medium',
            'RATE_LIMIT_EXCEEDED': 'medium',
            'INVALID_TOKEN': 'low',
            'ROLE_CHANGE': 'high'
        };
        return severityMap[event.type] || 'low';
    }

    shouldUpdateThreatLevel(securityLog) {
        return securityLog.severity === 'high' ||
               (new Date() - this.lastThreatAssessment) > 5 * 60 * 1000; // 5 minutes
    }

    // Database Operations
    async saveSecurityLog(log) {
        // Implementation for saving to database
    }

    async getActiveAlertCount() {
        return this.activeAlerts.size;
    }

    async getSuspiciousIPCount() {
        return this.suspiciousIPs.size;
    }

    async getAnomalyScore() {
        // Implementation for calculating anomaly score
        return 0;
    }

    // WebSocket Notifications
    emitSecurityAlert(alert) {
        // Implementation for WebSocket notification
    }
}

module.exports = new SecurityMonitor();
