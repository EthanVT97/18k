const jwt = require('jsonwebtoken');
const { RateLimiterMongo } = require('rate-limiter-flexible');
const mongoose = require('mongoose');

// Rate limiter setup
const rateLimiter = new RateLimiterMongo({
    storeClient: mongoose.connection,
    keyPrefix: 'middleware',
    points: 10, // 10 requests
    duration: 1, // per 1 second
});

// Rate limiting middleware
exports.rateLimiter = async (req, res, next) => {
    try {
        await rateLimiter.consume(req.ip);
        next();
    } catch (error) {
        res.status(429).json({ message: 'Too many requests' });
    }
};

// JWT authentication middleware
exports.authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, process.env.JWT_SECRET, (err, agent) => {
            if (err) {
                return res.status(403).json({ message: 'Invalid or expired token' });
            }

            req.agent = agent;
            next();
        });
    } else {
        res.status(401).json({ message: 'Authorization token required' });
    }
};

// WebSocket authentication middleware
exports.authenticateWSConnection = (info, cb) => {
    const token = info.req.url.split('token=')[1];

    if (!token) {
        cb(false, 401, 'Unauthorized');
        return;
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            cb(false, 403, 'Invalid token');
            return;
        }

        info.req.agent = decoded;
        cb(true);
    });
};

// Role-based access control middleware
exports.authorize = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        if (!req.agent || !roles.includes(req.agent.role)) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        next();
    };
};

// Session validation middleware
exports.validateSession = (req, res, next) => {
    if (!req.session || !req.session.agentId) {
        return res.status(401).json({ message: 'Invalid session' });
    }
    next();
};
