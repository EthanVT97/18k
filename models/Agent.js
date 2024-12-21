const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const agentSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'agent'],
        default: 'agent'
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'busy'],
        default: 'offline'
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    twoFactorSecret: {
        type: String,
        default: null
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorBackupCodes: [{
        code: String,
        used: {
            type: Boolean,
            default: false
        }
    }],
    passwordResetToken: String,
    passwordResetExpires: Date,
    failedLoginAttempts: {
        type: Number,
        default: 0
    },
    accountLocked: {
        type: Boolean,
        default: false
    },
    lockoutExpires: Date,
    securityQuestions: [{
        question: String,
        answer: String
    }]
}, {
    timestamps: true
});

// Hash password before saving
agentSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
agentSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// Generate password reset token
agentSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    this.passwordResetExpires = Date.now() + 3600000; // 1 hour
    return resetToken;
};

// Generate 2FA backup codes
agentSchema.methods.generateBackupCodes = function() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
        codes.push({
            code: crypto.randomBytes(4).toString('hex'),
            used: false
        });
    }
    this.twoFactorBackupCodes = codes;
    return codes;
};

// Handle failed login attempts
agentSchema.methods.handleFailedLogin = async function() {
    this.failedLoginAttempts += 1;
    
    if (this.failedLoginAttempts >= 5) {
        this.accountLocked = true;
        this.lockoutExpires = Date.now() + 1800000; // 30 minutes
    }
    
    await this.save();
};

// Reset failed login attempts
agentSchema.methods.resetFailedAttempts = async function() {
    this.failedLoginAttempts = 0;
    this.accountLocked = false;
    this.lockoutExpires = null;
    await this.save();
};

const Agent = mongoose.model('Agent', agentSchema);

// Create admin user if it doesn't exist
async function createAdminUser() {
    try {
        const adminExists = await Agent.findOne({ username: 'admin' });
        if (!adminExists) {
            await Agent.create({
                username: 'admin',
                email: 'admin@18kchat.com',
                password: '123',
                role: 'admin'
            });
            console.log('Admin user created successfully');
        }
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
}

// Call createAdminUser when the application starts
createAdminUser();

module.exports = Agent;
