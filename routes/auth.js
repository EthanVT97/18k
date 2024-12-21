const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Agent = require('../models/Agent');
const { rateLimiter } = require('../middleware/auth');

// Validation rules
const loginValidation = [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
];

const registerValidation = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 characters long'),
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
    body('languages')
        .isArray()
        .withMessage('Languages must be an array')
        .notEmpty()
        .withMessage('At least one language must be selected')
];

// Register new agent
router.post('/register', registerValidation, rateLimiter, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password, languages } = req.body;

        // Check if agent already exists
        const existingAgent = await Agent.findOne({
            $or: [{ username }, { email }]
        });

        if (existingAgent) {
            return res.status(400).json({
                message: 'Username or email already exists'
            });
        }

        // Create new agent
        const agent = new Agent({
            username,
            email,
            password,
            languages,
            quickResponses: getDefaultQuickResponses(languages)
        });

        await agent.save();

        res.status(201).json({
            message: 'Agent registered successfully'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            message: 'Error registering agent'
        });
    }
});

// Enhanced login route with session management and security features
router.post('/login', loginValidation, rateLimiter, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        // Find agent and include necessary fields
        const agent = await Agent.findOne({ username })
            .select('+password +loginAttempts +lockUntil')
            .exec();

        if (!agent) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check account lock
        if (agent.isLocked()) {
            return res.status(423).json({
                message: 'Account is locked. Please try again later.',
                lockUntil: agent.lockUntil
            });
        }

        // Verify password
        const isValid = await agent.comparePassword(password);
        
        if (!isValid) {
            await agent.incrementLoginAttempts();
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Reset login attempts on successful login
        await agent.resetLoginAttempts();

        // Generate tokens
        const accessToken = jwt.sign(
            { id: agent._id, role: 'agent' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const refreshToken = jwt.sign(
            { id: agent._id, tokenVersion: agent.tokenVersion },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        // Update last login
        agent.lastLogin = new Date();
        await agent.save();

        // Set refresh token in HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            accessToken,
            agent: {
                id: agent._id,
                username: agent.username,
                email: agent.email,
                languages: agent.languages,
                status: agent.status
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error during login' });
    }
});

// Refresh token endpoint
router.post('/refresh-token', async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: 'No refresh token' });
        }

        const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const agent = await Agent.findById(payload.id);

        if (!agent || agent.tokenVersion !== payload.tokenVersion) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        const accessToken = jwt.sign(
            { id: agent._id, role: 'agent' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ accessToken });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({ message: 'Invalid refresh token' });
    }
});

// Secure logout with token invalidation
router.post('/logout', async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            const agent = await Agent.findById(payload.id);
            
            if (agent) {
                // Invalidate refresh token
                agent.tokenVersion += 1;
                await agent.save();
            }
        }

        // Clear refresh token cookie
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Error during logout' });
    }
});

// Get current agent
router.get('/me', rateLimiter, async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const agent = await Agent.findById(decoded.id).select('-password');
        if (!agent) {
            return res.status(404).json({ message: 'Agent not found' });
        }
        res.json(agent);
    } catch (error) {
        console.error('Get agent error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get default quick responses based on languages
function getDefaultQuickResponses(languages) {
    const quickResponses = [];
    const responses = {
        en: [
            'Hello! How can I assist you today?',
            'Thank you for contacting us.',
            'I understand your concern.',
            'Let me check that for you.',
            'Is there anything else I can help you with?',
            'Please wait a moment while I look into this.',
            'I apologize for any inconvenience.',
            'Thank you for your patience.'
        ],
        my: [
            'မင်္ဂလာပါ! ကျွန်တော်/မ ဘယ်လိုကူညီပေးရမလဲ?',
            'ဆက်သွယ်ပေးတဲ့အတွက် ကျေးဇူးတင်ပါတယ်။',
            'သင့်ရဲ့ စိုးရိမ်မှုကို နားလည်ပါတယ်။',
            'ဒါကို စစ်ဆေးပေးပါ့မယ်။',
            'နောက်ထပ် ဘာများ ကူညီပေးရမလဲ?',
            'ခဏလေး စောင့်ပေးပါ။',
            'အဆင်မပြေမှုအတွက် တောင်းပန်ပါတယ်။',
            'စိတ်ရှည်သည်းခံပေးတဲ့အတွက် ကျေးဇူးတင်ပါတယ်။'
        ],
        th: [
            'สวัสดีครับ/ค่ะ! จะให้ช่วยอะไรดีครับ/คะ?',
            'ขอบคุณที่ติดต่อเรา',
            'เข้าใจความกังวลของคุณ',
            'ขอตรวจสอบให้นะครับ/คะ',
            'มีอะไรให้ช่วยเพิ่มเติมไหมครับ/คะ?',
            'รอสักครู่นะครับ/คะ',
            'ขออภัยในความไม่สะดวก',
            'ขอบคุณที่รอนะครับ/คะ'
        ]
    };

    languages.forEach(lang => {
        if (responses[lang]) {
            responses[lang].forEach(text => {
                quickResponses.push({ text, language: lang });
            });
        }
    });

    return quickResponses;
}

module.exports = router;
