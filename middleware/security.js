const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const jwt = require('jsonwebtoken');

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// JWT verification middleware
const verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        return res.status(400).json({ message: 'Invalid token' });
    }
};

// Session activity tracker
const activityTracker = (req, res, next) => {
    if (req.user) {
        // Update last activity timestamp
        req.user.lastActivity = Date.now();
    }
    next();
};

// CORS configuration
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
};

// Security middleware setup
const setupSecurity = (app) => {
    // Basic security headers
    app.use(helmet());
    
    // Prevent NoSQL injection
    app.use(mongoSanitize());
    
    // Prevent XSS attacks
    app.use(xss());
    
    // Rate limiting
    app.use('/api/', limiter);
    
    // Secure cookie settings
    app.use((req, res, next) => {
        res.cookie('secure', 'value', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 1000 * 60 * 60 * 24 // 24 hours
        });
        next();
    });
};

module.exports = {
    setupSecurity,
    verifyToken,
    activityTracker,
    corsOptions
};
