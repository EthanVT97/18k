const db = require('../config/database');
const redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class ChatService {
    constructor() {
        this.redisClient = new redis(process.env.REDIS_URL);
    }

    // Create a new chat session
    async createChatSession(userId, metadata = {}) {
        const sessionId = uuidv4();
        const session = {
            id: sessionId,
            userId,
            status: 'waiting',
            startTime: new Date().toISOString(),
            metadata
        };

        await this.redisClient.hset(`chat:${sessionId}`, session);
        return sessionId;
    }

    // Assign an agent to a chat session
    async assignAgent(sessionId, agentId) {
        const session = await this.redisClient.hgetall(`chat:${sessionId}`);
        if (!session) {
            throw new Error('Chat session not found');
        }

        session.agentId = agentId;
        session.status = 'active';
        session.assignedTime = new Date().toISOString();

        await this.redisClient.hset(`chat:${sessionId}`, session);
        return session;
    }

    // Store a chat message
    async storeMessage(sessionId, message) {
        const messageId = uuidv4();
        const messageData = {
            id: messageId,
            sessionId,
            sender: message.sender,
            content: message.content,
            timestamp: new Date().toISOString()
        };

        await this.redisClient.rpush(`chat:${sessionId}:messages`, JSON.stringify(messageData));
        
        // Store in MySQL for persistence
        const query = `
            INSERT INTO chat_messages (id, session_id, sender_id, content, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `;
        await db.query(query, [messageId, sessionId, message.sender, message.content]);

        return messageId;
    }

    // Get chat history
    async getChatHistory(sessionId) {
        const messages = await this.redisClient.lrange(`chat:${sessionId}:messages`, 0, -1);
        return messages.map(msg => JSON.parse(msg));
    }

    // End chat session
    async endChatSession(sessionId) {
        const session = await this.redisClient.hgetall(`chat:${sessionId}`);
        if (!session) {
            throw new Error('Chat session not found');
        }

        session.status = 'ended';
        session.endTime = new Date().toISOString();

        // Update Redis
        await this.redisClient.hset(`chat:${sessionId}`, session);

        // Store in MySQL for persistence
        const query = `
            INSERT INTO chat_sessions (
                id, user_id, agent_id, status, start_time, end_time, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        await db.query(query, [
            sessionId,
            session.userId,
            session.agentId,
            'ended',
            session.startTime,
            session.endTime,
            JSON.stringify(session.metadata)
        ]);

        // Clean up Redis after 24 hours
        setTimeout(async () => {
            await this.redisClient.del(`chat:${sessionId}`);
            await this.redisClient.del(`chat:${sessionId}:messages`);
        }, 24 * 60 * 60 * 1000);

        return session;
    }

    // Get active sessions for an agent
    async getAgentActiveSessions(agentId) {
        const keys = await this.redisClient.keys('chat:*');
        const sessions = [];

        for (const key of keys) {
            if (key.includes(':messages')) continue;
            
            const session = await this.redisClient.hgetall(key);
            if (session.agentId === agentId && session.status === 'active') {
                sessions.push(session);
            }
        }

        return sessions;
    }

    // Get waiting sessions
    async getWaitingSessions() {
        const keys = await this.redisClient.keys('chat:*');
        const sessions = [];

        for (const key of keys) {
            if (key.includes(':messages')) continue;
            
            const session = await this.redisClient.hgetall(key);
            if (session.status === 'waiting') {
                sessions.push(session);
            }
        }

        return sessions;
    }
}

module.exports = new ChatService();
