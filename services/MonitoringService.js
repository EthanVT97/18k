const os = require('os');
const WebSocket = require('ws');
const EventEmitter = require('events');
const mongoose = require('mongoose');
const Agent = require('../models/Agent');
const Chat = require('../models/Chat');

class MonitoringService extends EventEmitter {
    constructor() {
        super();
        this.metrics = {
            system: {
                cpu: [],
                memory: [],
                network: [],
                disk: []
            },
            application: {
                activeUsers: 0,
                activeSessions: 0,
                requestRate: 0,
                errorRate: 0
            },
            chat: {
                activeChats: 0,
                queueLength: 0,
                avgResponseTime: 0,
                satisfactionScore: 0
            },
            security: {
                failedLogins: 0,
                suspiciousActivities: [],
                blockedIPs: new Set(),
                activeAlerts: []
            },
            performance: {
                responseTime: [],
                throughput: [],
                errorRates: [],
                loadTimes: []
            }
        };

        this.thresholds = {
            cpu: { warning: 70, critical: 90 },
            memory: { warning: 80, critical: 95 },
            responseTime: { warning: 2000, critical: 5000 },
            errorRate: { warning: 5, critical: 10 },
            queueLength: { warning: 10, critical: 20 }
        };

        this.anomalyDetectors = new Map();
        this.subscribers = new Set();
        this.initialize();
    }

    async initialize() {
        this.initializeAnomalyDetectors();
        this.startMetricCollection();
        this.setupWebSocket();
        this.setupDatabaseMonitoring();
    }

    // Metric Collection
    startMetricCollection() {
        // System Metrics
        setInterval(() => this.collectSystemMetrics(), 5000);
        
        // Application Metrics
        setInterval(() => this.collectApplicationMetrics(), 10000);
        
        // Performance Metrics
        setInterval(() => this.collectPerformanceMetrics(), 15000);
        
        // Security Metrics
        setInterval(() => this.collectSecurityMetrics(), 30000);
        
        // Cleanup old metrics
        setInterval(() => this.cleanupOldMetrics(), 3600000);
    }

    async collectSystemMetrics() {
        const cpuUsage = await this.getCPUUsage();
        const memUsage = this.getMemoryUsage();
        const networkStats = this.getNetworkStats();
        const diskStats = this.getDiskStats();

        this.metrics.system.cpu.push({ timestamp: Date.now(), value: cpuUsage });
        this.metrics.system.memory.push({ timestamp: Date.now(), value: memUsage });
        this.metrics.system.network.push({ timestamp: Date.now(), ...networkStats });
        this.metrics.system.disk.push({ timestamp: Date.now(), ...diskStats });

        this.checkThresholds('system');
        this.broadcastMetrics('system');
    }

    async collectApplicationMetrics() {
        const metrics = await this.getApplicationMetrics();
        Object.assign(this.metrics.application, metrics);
        
        this.checkThresholds('application');
        this.broadcastMetrics('application');
    }

    async collectPerformanceMetrics() {
        const metrics = await this.getPerformanceMetrics();
        Object.assign(this.metrics.performance, metrics);
        
        this.checkThresholds('performance');
        this.broadcastMetrics('performance');
    }

    async collectSecurityMetrics() {
        const metrics = await this.getSecurityMetrics();
        Object.assign(this.metrics.security, metrics);
        
        this.checkThresholds('security');
        this.broadcastMetrics('security');
    }

    // Metric Calculations
    async getCPUUsage() {
        const cpus = os.cpus();
        const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
        const totalTick = cpus.reduce((acc, cpu) => 
            acc + Object.values(cpu.times).reduce((sum, time) => sum + time, 0), 0);
        return 100 - (totalIdle / totalTick * 100);
    }

    getMemoryUsage() {
        const total = os.totalmem();
        const free = os.freemem();
        return ((total - free) / total) * 100;
    }

    getNetworkStats() {
        const networkInterfaces = os.networkInterfaces();
        let bytesReceived = 0;
        let bytesSent = 0;

        Object.values(networkInterfaces).forEach(interfaces => {
            interfaces.forEach(interface => {
                if (!interface.internal) {
                    bytesReceived += interface.bytesReceived || 0;
                    bytesSent += interface.bytesSent || 0;
                }
            });
        });

        return { bytesReceived, bytesSent };
    }

    getDiskStats() {
        // Implementation for disk stats
        return { used: 0, available: 0, total: 0 };
    }

    async getApplicationMetrics() {
        const activeUsers = await Agent.countDocuments({ status: 'online' });
        const activeSessions = await this.getActiveSessions();
        const { requestRate, errorRate } = await this.getRequestMetrics();

        return { activeUsers, activeSessions, requestRate, errorRate };
    }

    async getPerformanceMetrics() {
        const responseTime = await this.calculateAverageResponseTime();
        const throughput = await this.calculateThroughput();
        const errorRates = await this.calculateErrorRates();
        const loadTimes = await this.calculateLoadTimes();

        return { responseTime, throughput, errorRates, loadTimes };
    }

    async getSecurityMetrics() {
        const failedLogins = await this.getFailedLoginCount();
        const suspiciousActivities = await this.getSuspiciousActivities();
        const blockedIPs = await this.getBlockedIPs();
        const activeAlerts = await this.getActiveSecurityAlerts();

        return { failedLogins, suspiciousActivities, blockedIPs, activeAlerts };
    }

    // Anomaly Detection
    initializeAnomalyDetectors() {
        this.anomalyDetectors.set('responseTime', this.createAnomalyDetector({
            windowSize: 100,
            threshold: 2.5
        }));

        this.anomalyDetectors.set('errorRate', this.createAnomalyDetector({
            windowSize: 50,
            threshold: 3
        }));

        this.anomalyDetectors.set('userBehavior', this.createAnomalyDetector({
            windowSize: 200,
            threshold: 2
        }));
    }

    createAnomalyDetector({ windowSize, threshold }) {
        return {
            values: [],
            mean: 0,
            stdDev: 0,
            windowSize,
            threshold,

            addValue(value) {
                this.values.push(value);
                if (this.values.length > this.windowSize) {
                    this.values.shift();
                }
                this.updateStats();
            },

            updateStats() {
                const n = this.values.length;
                this.mean = this.values.reduce((a, b) => a + b, 0) / n;
                this.stdDev = Math.sqrt(
                    this.values.reduce((a, b) => a + Math.pow(b - this.mean, 2), 0) / n
                );
            },

            isAnomaly(value) {
                if (this.values.length < this.windowSize / 2) return false;
                const zScore = Math.abs((value - this.mean) / this.stdDev);
                return zScore > this.threshold;
            }
        };
    }

    // WebSocket Management
    setupWebSocket() {
        this.wss = new WebSocket.Server({ noServer: true });

        this.wss.on('connection', (ws) => {
            this.subscribers.add(ws);

            ws.on('message', (message) => {
                this.handleWebSocketMessage(ws, message);
            });

            ws.on('close', () => {
                this.subscribers.delete(ws);
            });
        });
    }

    broadcastMetrics(type) {
        const message = JSON.stringify({
            type: 'metrics',
            category: type,
            data: this.metrics[type],
            timestamp: Date.now()
        });

        this.subscribers.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    // Database Monitoring
    setupDatabaseMonitoring() {
        mongoose.connection.on('error', this.handleDatabaseError.bind(this));
        mongoose.connection.on('disconnected', this.handleDatabaseDisconnect.bind(this));
        
        // Monitor database operations
        mongoose.connection.on('query', this.handleDatabaseQuery.bind(this));
    }

    // Alert Management
    async createAlert(type, severity, message, data = {}) {
        const alert = {
            type,
            severity,
            message,
            data,
            timestamp: Date.now(),
            acknowledged: false
        };

        this.metrics.security.activeAlerts.push(alert);
        this.broadcastAlert(alert);
        
        // Persist alert if needed
        // await this.persistAlert(alert);
    }

    // Utility Functions
    cleanupOldMetrics() {
        const now = Date.now();
        const oneHour = 3600000;

        Object.keys(this.metrics.system).forEach(key => {
            this.metrics.system[key] = this.metrics.system[key].filter(
                metric => now - metric.timestamp < oneHour
            );
        });

        this.metrics.performance.responseTime = this.metrics.performance.responseTime.filter(
            metric => now - metric.timestamp < oneHour
        );
    }

    // Event Handlers
    handleDatabaseError(error) {
        this.createAlert('database', 'critical', 'Database error occurred', { error });
    }

    handleDatabaseDisconnect() {
        this.createAlert('database', 'critical', 'Database connection lost');
    }

    handleDatabaseQuery(query) {
        // Monitor query performance
        const startTime = Date.now();
        query.then(() => {
            const duration = Date.now() - startTime;
            this.metrics.performance.responseTime.push({
                timestamp: Date.now(),
                value: duration,
                type: 'database'
            });
        });
    }

    handleWebSocketMessage(ws, message) {
        try {
            const data = JSON.parse(message);
            switch (data.type) {
                case 'subscribe':
                    this.handleSubscription(ws, data);
                    break;
                case 'acknowledge':
                    this.handleAlertAcknowledgement(data);
                    break;
                default:
                    console.warn('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    }
}

module.exports = new MonitoringService();
