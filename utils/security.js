const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const UAParser = require('ua-parser-js');

// Generate device ID
exports.generateDeviceId = (userAgent, ip) => {
    const data = `${userAgent}${ip}${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
};

// Generate 2FA secret
exports.generateTwoFactorSecret = async () => {
    const secret = speakeasy.generateSecret({
        name: '18KChat Support',
        length: 20
    });
    
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    
    return {
        secret: secret.base32,
        qrCode: qrCodeUrl
    };
};

// Verify 2FA token
exports.verifyTwoFactorToken = (token, secret) => {
    return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 1 // Allow 30 seconds window
    });
};

// Generate backup codes
exports.generateBackupCodes = (count = 10) => {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(code);
    }
    return codes;
};

// Parse user agent
exports.parseUserAgent = (userAgent) => {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    
    return {
        browser: `${result.browser.name} ${result.browser.version}`,
        os: `${result.os.name} ${result.os.version}`,
        device: result.device.type || 'desktop'
    };
};

// Generate session ID
exports.generateSessionId = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Password strength checker
exports.checkPasswordStrength = (password) => {
    let strength = 0;
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        numbers: /\d/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
        repeating: !/(.)\\1{2,}/.test(password), // No character repeated more than twice
        sequential: !/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/.test(password.toLowerCase()) // No sequential characters
    };

    // Calculate strength score
    strength += checks.length ? 1 : 0;
    strength += checks.uppercase ? 1 : 0;
    strength += checks.lowercase ? 1 : 0;
    strength += checks.numbers ? 1 : 0;
    strength += checks.special ? 1 : 0;
    strength += checks.repeating ? 1 : 0;
    strength += checks.sequential ? 1 : 0;

    return {
        score: strength,
        checks,
        feedback: getPasswordFeedback(checks)
    };
};

// Get password feedback
function getPasswordFeedback(checks) {
    const feedback = [];
    
    if (!checks.length) feedback.push('Use at least 8 characters');
    if (!checks.uppercase) feedback.push('Include uppercase letters');
    if (!checks.lowercase) feedback.push('Include lowercase letters');
    if (!checks.numbers) feedback.push('Include numbers');
    if (!checks.special) feedback.push('Include special characters');
    if (!checks.repeating) feedback.push('Avoid repeating characters');
    if (!checks.sequential) feedback.push('Avoid sequential characters');

    return feedback;
}

// Security question templates
exports.securityQuestions = [
    "What was the name of your first pet?",
    "In which city were you born?",
    "What was your childhood nickname?",
    "What was the name of your first school?",
    "What is your mother's maiden name?",
    "What was the make of your first car?",
    "What is the name of the street you grew up on?",
    "What is your favorite book from childhood?",
    "What is the name of your favorite childhood teacher?",
    "What is your favorite movie from childhood?"
];

// Hash security question answer
exports.hashAnswer = (answer) => {
    return crypto.createHash('sha256')
        .update(answer.toLowerCase().trim())
        .digest('hex');
};

// Generate password reset token
exports.generateResetToken = () => {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 3600000; // 1 hour
    return { token, expires };
};
