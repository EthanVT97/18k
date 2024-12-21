class AdminMonitoring {
    constructor() {
        this.monitors = new Map();
        this.alerts = [];
        this.metricHistory = new Map();
        this.thresholds = new Map();
        this.initializeMonitors();
    }

    // Initialize monitoring components
    initializeMonitors() {
        // System Health Monitoring
        this.addMonitor('system_health', {
            cpu_usage: 0,
            memory_usage: 0,
            disk_space: 0,
            network_latency: 0,
            active_connections: 0
        });

        // Security Monitoring
        this.addMonitor('security', {
            failed_logins: 0,
            suspicious_ips: new Set(),
            blocked_attempts: 0,
            active_sessions: 0,
            2fa_usage: 0
        });

        // Chat Performance Monitoring
        this.addMonitor('chat_performance', {
            average_response_time: 0,
            concurrent_chats: 0,
            queue_length: 0,
            satisfaction_score: 0,
            abandoned_chats: 0
        });

        // Agent Performance Monitoring
        this.addMonitor('agent_performance', {
            online_agents: 0,
            average_handling_time: 0,
            resolution_rate: 0,
            customer_satisfaction: 0,
            response_time: 0
        });

        // Language Usage Monitoring
        this.addMonitor('language_usage', {
            english: 0,
            myanmar: 0,
            thai: 0,
            korean: 0,
            vietnamese: 0
        });

        this.initializeThresholds();
    }

    // Add a new monitor
    addMonitor(name, metrics) {
        this.monitors.set(name, {
            metrics,
            lastUpdate: new Date(),
            status: 'healthy'
        });
    }

    // Set monitoring thresholds
    initializeThresholds() {
        this.thresholds.set('system_health', {
            cpu_usage: { warning: 70, critical: 90 },
            memory_usage: { warning: 80, critical: 95 },
            disk_space: { warning: 85, critical: 95 }
        });

        this.thresholds.set('chat_performance', {
            average_response_time: { warning: 120, critical: 300 }, // seconds
            queue_length: { warning: 10, critical: 20 }
        });

        this.thresholds.set('security', {
            failed_logins: { warning: 50, critical: 100 },
            suspicious_ips: { warning: 5, critical: 10 }
        });
    }

    // Update metrics
    updateMetrics(monitorName, metrics) {
        const monitor = this.monitors.get(monitorName);
        if (!monitor) return;

        // Update metrics
        Object.assign(monitor.metrics, metrics);
        monitor.lastUpdate = new Date();

        // Store historical data
        this.storeMetricHistory(monitorName, metrics);

        // Check thresholds
        this.checkThresholds(monitorName);

        // Emit updates
        this.emitMetricUpdate(monitorName);
    }

    // Store metric history
    storeMetricHistory(monitorName, metrics) {
        if (!this.metricHistory.has(monitorName)) {
            this.metricHistory.set(monitorName, []);
        }

        const history = this.metricHistory.get(monitorName);
        history.push({
            timestamp: new Date(),
            metrics: { ...metrics }
        });

        // Keep last 24 hours of data
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        while (history.length > 0 && history[0].timestamp < dayAgo) {
            history.shift();
        }
    }

    // Check thresholds and generate alerts
    checkThresholds(monitorName) {
        const monitor = this.monitors.get(monitorName);
        const thresholds = this.thresholds.get(monitorName);
        if (!monitor || !thresholds) return;

        Object.entries(monitor.metrics).forEach(([metric, value]) => {
            const metricThresholds = thresholds[metric];
            if (!metricThresholds) return;

            if (value >= metricThresholds.critical) {
                this.createAlert(monitorName, metric, 'critical', value);
            } else if (value >= metricThresholds.warning) {
                this.createAlert(monitorName, metric, 'warning', value);
            }
        });
    }

    // Create and manage alerts
    createAlert(monitor, metric, severity, value) {
        const alert = {
            id: crypto.randomUUID(),
            monitor,
            metric,
            severity,
            value,
            timestamp: new Date(),
            acknowledged: false
        };

        this.alerts.push(alert);
        this.emitAlert(alert);
    }

    // Get monitoring data
    getMonitoringData(monitorName) {
        const monitor = this.monitors.get(monitorName);
        if (!monitor) return null;

        return {
            currentMetrics: monitor.metrics,
            history: this.metricHistory.get(monitorName) || [],
            status: monitor.status,
            lastUpdate: monitor.lastUpdate
        };
    }

    // Get active alerts
    getActiveAlerts() {
        return this.alerts.filter(alert => !alert.acknowledged);
    }

    // Acknowledge alert
    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            this.emitAlertUpdate(alert);
        }
    }

    // Generate monitoring report
    generateReport(timeframe = '24h') {
        const reports = {};
        
        this.monitors.forEach((monitor, name) => {
            const history = this.metricHistory.get(name) || [];
            const filteredHistory = this.filterHistoryByTimeframe(history, timeframe);
            
            reports[name] = {
                currentStatus: monitor.status,
                metrics: this.calculateMetricsSummary(filteredHistory),
                alerts: this.getAlertsSummary(name, timeframe),
                trends: this.calculateTrends(filteredHistory)
            };
        });

        return reports;
    }

    // Calculate metrics summary
    calculateMetricsSummary(history) {
        if (history.length === 0) return {};

        const summary = {};
        const metrics = Object.keys(history[0].metrics);

        metrics.forEach(metric => {
            const values = history.map(h => h.metrics[metric]);
            summary[metric] = {
                current: values[values.length - 1],
                average: values.reduce((a, b) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values)
            };
        });

        return summary;
    }

    // Calculate trends
    calculateTrends(history) {
        if (history.length < 2) return {};

        const trends = {};
        const metrics = Object.keys(history[0].metrics);

        metrics.forEach(metric => {
            const values = history.map(h => h.metrics[metric]);
            const trend = this.calculateTrendDirection(values);
            trends[metric] = {
                direction: trend.direction,
                percentage: trend.percentage
            };
        });

        return trends;
    }

    // Calculate trend direction
    calculateTrendDirection(values) {
        const first = values[0];
        const last = values[values.length - 1];
        const change = ((last - first) / first) * 100;

        return {
            direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
            percentage: Math.abs(change)
        };
    }

    // Filter history by timeframe
    filterHistoryByTimeframe(history, timeframe) {
        const now = new Date();
        let cutoff;

        switch (timeframe) {
            case '1h':
                cutoff = new Date(now - 60 * 60 * 1000);
                break;
            case '6h':
                cutoff = new Date(now - 6 * 60 * 60 * 1000);
                break;
            case '24h':
                cutoff = new Date(now - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000);
                break;
            default:
                cutoff = new Date(now - 24 * 60 * 60 * 1000);
        }

        return history.filter(h => h.timestamp >= cutoff);
    }

    // Get alerts summary
    getAlertsSummary(monitorName, timeframe) {
        const cutoff = this.getTimeframeCutoff(timeframe);
        const relevantAlerts = this.alerts.filter(
            alert => alert.monitor === monitorName && alert.timestamp >= cutoff
        );

        return {
            total: relevantAlerts.length,
            critical: relevantAlerts.filter(a => a.severity === 'critical').length,
            warning: relevantAlerts.filter(a => a.severity === 'warning').length,
            acknowledged: relevantAlerts.filter(a => a.acknowledged).length,
            unacknowledged: relevantAlerts.filter(a => !a.acknowledged).length
        };
    }

    // Get timeframe cutoff
    getTimeframeCutoff(timeframe) {
        const now = new Date();
        switch (timeframe) {
            case '1h': return new Date(now - 60 * 60 * 1000);
            case '6h': return new Date(now - 6 * 60 * 60 * 1000);
            case '24h': return new Date(now - 24 * 60 * 60 * 1000);
            case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000);
            default: return new Date(now - 24 * 60 * 60 * 1000);
        }
    }

    // WebSocket event emitters
    emitMetricUpdate(monitorName) {
        // Implementation for WebSocket event emission
    }

    emitAlert(alert) {
        // Implementation for WebSocket alert emission
    }

    emitAlertUpdate(alert) {
        // Implementation for WebSocket alert update emission
    }
}

module.exports = new AdminMonitoring();
