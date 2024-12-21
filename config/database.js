const mysql = require('mysql2/promise');
const Redis = require('ioredis');

// MySQL Configuration
const mysqlConfig = {
    development: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || '18kchat_dev',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        timezone: '+06:30'
    },
    production: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || '18kchat_prod',
        waitForConnections: true,
        connectionLimit: 50,
        queueLimit: 0,
        timezone: '+06:30',
        ssl: {
            rejectUnauthorized: false
        }
    }
};

// Redis Configuration
const redisConfig = {
    development: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 3
    },
    production: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
            return Math.min(times * 50, 2000);
        }
    }
};

class DatabaseConnection {
    constructor() {
        this.mysqlPool = null;
        this.redisClient = null;
        this.env = process.env.NODE_ENV || 'development';
        this.isConnected = false;
    }

    async connectMySQL() {
        try {
            if (!this.mysqlPool) {
                const config = mysqlConfig[this.env];
                this.mysqlPool = await mysql.createPool(config);
                
                // Test the connection
                const connection = await this.mysqlPool.getConnection();
                await connection.ping();
                connection.release();
                
                console.log('MySQL connected successfully');
                this.isConnected = true;
            }
            return this.mysqlPool;
        } catch (error) {
            console.error('MySQL connection failed:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async connectRedis() {
        try {
            const config = redisConfig[this.env];
            this.redisClient = new Redis(config);

            this.redisClient.on('error', (err) => {
                console.error('Redis connection error:', err);
                this.isConnected = false;
            });

            this.redisClient.on('connect', () => {
                console.log('Redis connected successfully');
                this.isConnected = true;
            });

            return this.redisClient;
        } catch (error) {
            console.error('Redis connection failed:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async query(sql, params = []) {
        try {
            if (!this.mysqlPool) {
                await this.connectMySQL();
            }
            const [results] = await this.mysqlPool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('Query error:', error);
            throw error;
        }
    }

    async transaction(callback) {
        let connection;
        try {
            connection = await this.mysqlPool.getConnection();
            await connection.beginTransaction();
            
            const result = await callback(connection);
            
            await connection.commit();
            return result;
        } catch (error) {
            if (connection) {
                await connection.rollback();
            }
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    async disconnect() {
        try {
            if (this.mysqlPool) {
                await this.mysqlPool.end();
                this.mysqlPool = null;
            }
            if (this.redisClient) {
                await this.redisClient.quit();
                this.redisClient = null;
            }
            this.isConnected = false;
        } catch (error) {
            console.error('Error disconnecting from databases:', error);
            throw error;
        }
    }

    // Health check method
    async healthCheck() {
        const health = {
            mysql: {
                status: 'disconnected',
                error: null
            },
            redis: {
                status: 'disconnected',
                error: null
            }
        };

        try {
            if (this.mysqlPool) {
                const connection = await this.mysqlPool.getConnection();
                await connection.ping();
                connection.release();
                health.mysql.status = 'connected';
            }
        } catch (error) {
            health.mysql.error = error.message;
        }

        try {
            if (this.redisClient && this.redisClient.status === 'ready') {
                health.redis.status = 'connected';
            }
        } catch (error) {
            health.redis.error = error.message;
        }

        return health;
    }
}

module.exports = new DatabaseConnection();
