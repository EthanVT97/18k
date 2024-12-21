const db = require('../config/database');
const redis = require('ioredis');

class ChatbotService {
    constructor() {
        this.redisClient = new redis(process.env.REDIS_URL);
        this.loadResponses();
    }

    // Load chatbot responses from database to Redis
    async loadResponses() {
        const query = 'SELECT * FROM chatbot_responses';
        const [responses] = await db.query(query);
        
        for (const response of responses) {
            await this.redisClient.hset(
                'chatbot:responses',
                response.trigger.toLowerCase(),
                JSON.stringify({
                    response: response.response,
                    category: response.category
                })
            );
        }
    }

    // Get response for user input
    async getResponse(userInput) {
        const normalizedInput = userInput.toLowerCase();
        
        // Check for exact matches
        const exactMatch = await this.redisClient.hget('chatbot:responses', normalizedInput);
        if (exactMatch) {
            return JSON.parse(exactMatch);
        }

        // Check for partial matches
        const allResponses = await this.redisClient.hgetall('chatbot:responses');
        for (const [trigger, responseData] of Object.entries(allResponses)) {
            if (normalizedInput.includes(trigger)) {
                return JSON.parse(responseData);
            }
        }

        // Return default response if no match found
        return {
            response: "I'm not sure how to help with that. Would you like to speak with a human agent?",
            category: "default"
        };
    }

    // Add new response
    async addResponse(trigger, response, category) {
        // Store in Redis
        await this.redisClient.hset(
            'chatbot:responses',
            trigger.toLowerCase(),
            JSON.stringify({ response, category })
        );

        // Store in MySQL
        const query = `
            INSERT INTO chatbot_responses (trigger, response, category)
            VALUES (?, ?, ?)
        `;
        await db.query(query, [trigger.toLowerCase(), response, category]);
    }

    // Update existing response
    async updateResponse(trigger, response, category) {
        // Update Redis
        await this.redisClient.hset(
            'chatbot:responses',
            trigger.toLowerCase(),
            JSON.stringify({ response, category })
        );

        // Update MySQL
        const query = `
            UPDATE chatbot_responses
            SET response = ?, category = ?
            WHERE trigger = ?
        `;
        await db.query(query, [response, category, trigger.toLowerCase()]);
    }

    // Delete response
    async deleteResponse(trigger) {
        // Delete from Redis
        await this.redisClient.hdel('chatbot:responses', trigger.toLowerCase());

        // Delete from MySQL
        const query = 'DELETE FROM chatbot_responses WHERE trigger = ?';
        await db.query(query, [trigger.toLowerCase()]);
    }

    // Get all responses
    async getAllResponses() {
        const query = 'SELECT * FROM chatbot_responses ORDER BY category, trigger';
        const [responses] = await db.query(query);
        return responses;
    }

    // Get responses by category
    async getResponsesByCategory(category) {
        const query = 'SELECT * FROM chatbot_responses WHERE category = ?';
        const [responses] = await db.query(query, [category]);
        return responses;
    }

    // Train chatbot with conversation history
    async trainFromHistory() {
        const query = `
            SELECT cm.content, cs.rating
            FROM chat_messages cm
            JOIN chat_sessions cs ON cm.session_id = cs.id
            WHERE cs.rating >= 4
            AND cm.sender_type = 'agent'
            ORDER BY cs.rating DESC
            LIMIT 1000
        `;
        const [messages] = await db.query(query);

        // Process messages to extract common patterns
        // This is a simplified example - in a real application,
        // you would use more sophisticated NLP techniques
        const patterns = this.extractPatterns(messages);

        // Store new patterns
        for (const pattern of patterns) {
            await this.addResponse(
                pattern.trigger,
                pattern.response,
                'learned'
            );
        }
    }

    // Helper method to extract patterns from conversation history
    extractPatterns(messages) {
        const patterns = [];
        // Implement pattern extraction logic here
        // This would typically involve:
        // 1. Text preprocessing
        // 2. Identifying common phrases
        // 3. Extracting question-answer pairs
        // 4. Using NLP techniques for intent recognition
        return patterns;
    }
}

module.exports = new ChatbotService();
