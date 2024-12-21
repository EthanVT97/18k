const db = require('../config/database');
const redis = require('ioredis');

class AgentService {
    constructor() {
        this.redisClient = new redis(process.env.REDIS_URL);
    }

    // Get all agents
    async getAllAgents() {
        const query = `
            SELECT id, username, email, status, created_at
            FROM users
            WHERE role = 'agent'
        `;
        const [agents] = await db.query(query);
        return agents;
    }

    // Get available agents
    async getAvailableAgents() {
        const agents = await this.redisClient.smembers('available_agents');
        return agents;
    }

    // Set agent status
    async setAgentStatus(agentId, status) {
        if (status === 'available') {
            await this.redisClient.sadd('available_agents', agentId);
        } else {
            await this.redisClient.srem('available_agents', agentId);
        }

        const query = `
            UPDATE users
            SET status = ?
            WHERE id = ? AND role = 'agent'
        `;
        await db.query(query, [status, agentId]);
    }

    // Get agent performance metrics
    async getAgentMetrics(agentId, startDate, endDate) {
        const query = `
            SELECT 
                COUNT(*) as total_chats,
                AVG(TIMESTAMPDIFF(MINUTE, start_time, end_time)) as avg_chat_duration,
                COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_ratings,
                COUNT(CASE WHEN rating < 4 THEN 1 END) as negative_ratings
            FROM chat_sessions
            WHERE agent_id = ?
            AND start_time BETWEEN ? AND ?
            AND status = 'ended'
        `;
        const [metrics] = await db.query(query, [agentId, startDate, endDate]);
        return metrics[0];
    }

    // Assign chat to agent
    async assignChat(agentId, chatId) {
        // Remove agent from available pool temporarily
        await this.redisClient.srem('available_agents', agentId);

        // Update agent's active chats
        await this.redisClient.sadd(`agent:${agentId}:chats`, chatId);

        // If agent has max chats, remove from available pool
        const activeChats = await this.redisClient.scard(`agent:${agentId}:chats`);
        if (activeChats < 3) { // Max 3 concurrent chats
            await this.redisClient.sadd('available_agents', agentId);
        }
    }

    // Remove chat assignment
    async removeChat(agentId, chatId) {
        await this.redisClient.srem(`agent:${agentId}:chats`, chatId);

        // If agent has capacity, add back to available pool
        const activeChats = await this.redisClient.scard(`agent:${agentId}:chats`);
        if (activeChats < 3) {
            await this.redisClient.sadd('available_agents', agentId);
        }
    }

    // Get agent's active chats
    async getAgentActiveChats(agentId) {
        return await this.redisClient.smembers(`agent:${agentId}:chats`);
    }

    // Update agent profile
    async updateAgentProfile(agentId, profile) {
        const query = `
            UPDATE users
            SET 
                username = ?,
                email = ?,
                status = ?
            WHERE id = ? AND role = 'agent'
        `;
        await db.query(query, [
            profile.username,
            profile.email,
            profile.status,
            agentId
        ]);
    }
}

module.exports = new AgentService();
