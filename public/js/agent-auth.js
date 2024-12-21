// DOM Elements
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');

// Session Management
let sessionTimeout;
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours
const WARNING_THRESHOLD = 10 * 60 * 1000; // 10 minutes

// Toast Notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Session Timer
function startSessionTimer() {
    const timerElement = document.createElement('div');
    timerElement.className = 'session-timer';
    document.body.appendChild(timerElement);

    function updateTimer() {
        const now = new Date().getTime();
        const loginTime = parseInt(localStorage.getItem('loginTime'));
        const timeLeft = SESSION_DURATION - (now - loginTime);

        if (timeLeft <= 0) {
            logout();
            return;
        }

        if (timeLeft <= WARNING_THRESHOLD) {
            timerElement.classList.add('warning');
        }

        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        timerElement.textContent = `Session expires in: ${minutes}m ${seconds}s`;
        timerElement.classList.add('show');
    }

    updateTimer();
    sessionTimeout = setInterval(updateTimer, 1000);
}

// Login Handler
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Store token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('agent', JSON.stringify(data.agent));
            localStorage.setItem('loginTime', new Date().getTime());

            // Start session timer
            startSessionTimer();

            // Show success message
            showToast('Login successful', 'success');

            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'agent-dashboard.html';
            }, 1000);
        } else {
            throw new Error(data.message || 'Login failed');
        }
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.classList.add('show');
        showToast(error.message, 'error');
    }
}

// Logout Handler
async function logout() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            showToast('Logged out successfully', 'success');
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Clear session data
        localStorage.removeItem('token');
        localStorage.removeItem('agent');
        localStorage.removeItem('loginTime');
        clearInterval(sessionTimeout);

        // Redirect to login
        window.location.href = 'agent-login.html';
    }
}

// Check Authentication Status
function checkAuth() {
    const token = localStorage.getItem('token');
    const loginTime = parseInt(localStorage.getItem('loginTime'));
    const now = new Date().getTime();

    if (!token || !loginTime || (now - loginTime) >= SESSION_DURATION) {
        logout();
        return false;
    }

    return true;
}

// Password Strength Checker
function checkPasswordStrength(password) {
    let strength = 0;
    const indicators = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        numbers: /\d/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
    };

    strength += indicators.length ? 1 : 0;
    strength += indicators.uppercase ? 1 : 0;
    strength += indicators.lowercase ? 1 : 0;
    strength += indicators.numbers ? 1 : 0;
    strength += indicators.special ? 1 : 0;

    return {
        score: strength,
        indicators
    };
}

// Event Listeners
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('agent-dashboard.html')) {
        if (!checkAuth()) {
            window.location.href = 'agent-login.html';
        } else {
            startSessionTimer();
        }
    }
});
