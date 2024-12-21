const db = require('../config/database');
const moment = require('moment');

class AnalyticsService {
    // Get overall chat statistics
    async getOverallStats(startDate, endDate) {
        const query = `
            SELECT 
                COUNT(*) as total_chats,
                COUNT(CASE WHEN status = 'ended' THEN 1 END) as completed_chats,
                COUNT(CASE WHEN status = 'abandoned' THEN 1 END) as abandoned_chats,
                AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating,
                AVG(TIMESTAMPDIFF(MINUTE, start_time, end_time)) as avg_duration
            FROM chat_sessions
            WHERE start_time BETWEEN ? AND ?
        `;
        const [stats] = await db.query(query, [startDate, endDate]);
        return stats[0];
    }

    // Get hourly chat distribution
    async getHourlyDistribution(startDate, endDate) {
        const query = `
            SELECT 
                HOUR(start_time) as hour,
                COUNT(*) as chat_count
            FROM chat_sessions
            WHERE start_time BETWEEN ? AND ?
            GROUP BY HOUR(start_time)
            ORDER BY hour
        `;
        const [distribution] = await db.query(query, [startDate, endDate]);
        return distribution;
    }

    // Get agent performance metrics
    async getAgentPerformance(startDate, endDate) {
        const query = `
            SELECT 
                u.username,
                COUNT(*) as total_chats,
                AVG(TIMESTAMPDIFF(MINUTE, cs.start_time, cs.end_time)) as avg_duration,
                AVG(cs.rating) as avg_rating,
                COUNT(CASE WHEN cs.rating >= 4 THEN 1 END) as positive_ratings,
                COUNT(CASE WHEN cs.rating < 4 THEN 1 END) as negative_ratings
            FROM chat_sessions cs
            JOIN users u ON cs.agent_id = u.id
            WHERE cs.start_time BETWEEN ? AND ?
            AND u.role = 'agent'
            GROUP BY u.id, u.username
            ORDER BY avg_rating DESC
        `;
        const [performance] = await db.query(query, [startDate, endDate]);
        return performance;
    }

    // Get chatbot effectiveness metrics
    async getChatbotMetrics(startDate, endDate) {
        const query = `
            SELECT 
                COUNT(*) as total_interactions,
                COUNT(CASE WHEN transferred_to_agent = 1 THEN 1 END) as agent_transfers,
                COUNT(CASE WHEN resolved_by_bot = 1 THEN 1 END) as bot_resolutions,
                (COUNT(CASE WHEN resolved_by_bot = 1 THEN 1 END) * 100.0 / COUNT(*)) as resolution_rate
            FROM chatbot_interactions
            WHERE timestamp BETWEEN ? AND ?
        `;
        const [metrics] = await db.query(query, [startDate, endDate]);
        return metrics[0];
    }

    // Get customer satisfaction trends
    async getSatisfactionTrends(startDate, endDate) {
        const query = `
            SELECT 
                DATE(end_time) as date,
                AVG(rating) as avg_rating,
                COUNT(*) as total_ratings
            FROM chat_sessions
            WHERE end_time BETWEEN ? AND ?
            AND rating IS NOT NULL
            GROUP BY DATE(end_time)
            ORDER BY date
        `;
        const [trends] = await db.query(query, [startDate, endDate]);
        return trends;
    }

    // Get response time metrics
    async getResponseTimeMetrics(startDate, endDate) {
        const query = `
            SELECT 
                AVG(first_response_time) as avg_first_response,
                AVG(avg_response_time) as avg_response_time,
                MIN(first_response_time) as min_first_response,
                MAX(first_response_time) as max_first_response
            FROM chat_sessions
            WHERE start_time BETWEEN ? AND ?
            AND status = 'ended'
        `;
        const [metrics] = await db.query(query, [startDate, endDate]);
        return metrics[0];
    }

    // Get chat volume trends
    async getChatVolumeTrends(startDate, endDate) {
        const query = `
            SELECT 
                DATE(start_time) as date,
                COUNT(*) as chat_count,
                COUNT(CASE WHEN status = 'ended' THEN 1 END) as completed_count,
                COUNT(CASE WHEN status = 'abandoned' THEN 1 END) as abandoned_count
            FROM chat_sessions
            WHERE start_time BETWEEN ? AND ?
            GROUP BY DATE(start_time)
            ORDER BY date
        `;
        const [trends] = await db.query(query, [startDate, endDate]);
        return trends;
    }

    // Get popular chat topics
    async getPopularTopics(startDate, endDate, limit = 10) {
        const query = `
            SELECT 
                topic,
                COUNT(*) as occurrence_count
            FROM chat_sessions
            WHERE start_time BETWEEN ? AND ?
            AND topic IS NOT NULL
            GROUP BY topic
            ORDER BY occurrence_count DESC
            LIMIT ?
        `;
        const [topics] = await db.query(query, [startDate, endDate, limit]);
        return topics;
    }

    // Get real-time metrics
    async getRealTimeMetrics() {
        const now = moment();
        const hourAgo = moment().subtract(1, 'hour');

        const query = `
            SELECT 
                COUNT(*) as active_chats,
                COUNT(DISTINCT agent_id) as active_agents,
                COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_customers
            FROM chat_sessions
            WHERE start_time >= ?
            AND (end_time IS NULL OR end_time >= ?)
        `;
        const [metrics] = await db.query(query, [hourAgo, now]);
        return metrics[0];
    }
}

module.exports = new AnalyticsService();
