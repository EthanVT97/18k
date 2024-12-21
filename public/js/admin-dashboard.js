// DOM Elements
const navMenu = document.querySelector('.nav-menu');
const tabContents = document.querySelectorAll('.tab-content');
const timeRangeSelect = document.getElementById('timeRange');
const threatLevel = document.getElementById('threatLevel');

// Mock data for testing
const mockData = {
    failedLogins: {
        count: 127,
        trend: 5.2,
        data: [65, 72, 81, 85, 90, 97, 105, 115, 120, 127]
    },
    activeSessions: {
        count: 342,
        trend: -2.1,
        data: [380, 375, 368, 362, 355, 350, 348, 345, 343, 342]
    },
    securityAlerts: {
        count: 8,
        trend: 3.7,
        data: [3, 4, 4, 5, 5, 6, 7, 7, 8, 8]
    },
    twoFactorUsage: {
        percentage: 78,
        trend: 8.3,
        data: [65, 67, 69, 70, 72, 73, 75, 76, 77, 78]
    }
};

// Chart configuration
const chartConfig = {
    type: 'line',
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)'
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)'
                }
            }
        },
        elements: {
            line: {
                tension: 0.4
            },
            point: {
                radius: 0
            }
        }
    }
};

// Socket.IO connection
const socket = io();
let currentChatId = null;
let typingTimer = null;

// Enhanced notification system
class NotificationManager {
    constructor() {
        this.permission = false;
        this.init();
    }

    async init() {
        try {
            const result = await Notification.requestPermission();
            this.permission = result === 'granted';
        } catch (error) {
            console.error('Notification permission error:', error);
        }
    }

    show(title, options = {}) {
        if (this.permission) {
            return new Notification(title, {
                icon: '/images/logo.png',
                badge: '/images/badge.png',
                ...options
            });
        }
        
        // Fallback to Toastify if notifications not allowed
        Toastify({
            text: title,
            duration: 3000,
            gravity: 'top',
            position: 'right',
            backgroundColor: options.type === 'error' ? '#ff4444' : '#4CAF50',
        }).showToast();
    }
}

const notifications = new NotificationManager();

// Enhanced real-time updates
class RealtimeManager {
    constructor(socket) {
        this.socket = socket;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.socket.on('connect', () => {
            this.reconnectAttempts = 0;
            updateConnectionStatus(true);
            notifications.show('Connected to server');
        });

        this.socket.on('disconnect', () => {
            updateConnectionStatus(false);
            this.handleReconnect();
        });

        this.socket.on('error', (error) => {
            notifications.show('Connection error', { 
                type: 'error',
                body: error.message 
            });
        });

        // Performance monitoring
        setInterval(() => {
            const performance = {
                memory: window.performance.memory,
                timing: window.performance.timing,
                navigation: window.performance.navigation
            };
            console.log('Performance metrics:', performance);
        }, 30000);
    }

    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            notifications.show('Unable to connect to server', { type: 'error' });
            return;
        }

        setTimeout(() => {
            this.reconnectAttempts++;
            this.socket.connect();
        }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }

    emit(event, data, callback) {
        return new Promise((resolve, reject) => {
            this.socket.emit(event, data, (response) => {
                if (response?.error) {
                    reject(response.error);
                } else {
                    resolve(response);
                }
            });
        });
    }
}

const realtimeManager = new RealtimeManager(socket);

// Enhanced chat handling with offline support
class ChatManager {
    constructor() {
        this.offlineMessages = new Map();
        this.setupOfflineSupport();
    }

    setupOfflineSupport() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registered:', registration);
                })
                .catch(error => {
                    console.error('ServiceWorker registration failed:', error);
                });
        }
    }

    async sendMessage(chatId, message) {
        try {
            await realtimeManager.emit('chat_message', {
                chatId,
                message,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            // Store message for later if offline
            if (!navigator.onLine) {
                this.storeOfflineMessage(chatId, message);
                notifications.show('Message will be sent when online', { type: 'info' });
            }
        }
    }

    storeOfflineMessage(chatId, message) {
        if (!this.offlineMessages.has(chatId)) {
            this.offlineMessages.set(chatId, []);
        }
        this.offlineMessages.get(chatId).push({
            message,
            timestamp: new Date().toISOString()
        });
        
        // Store in IndexedDB for persistence
        this.saveToIndexedDB(chatId, message);
    }

    async saveToIndexedDB(chatId, message) {
        try {
            const db = await this.getIndexedDB();
            const tx = db.transaction('messages', 'readwrite');
            const store = tx.objectStore('messages');
            await store.add({
                chatId,
                message,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('IndexedDB save error:', error);
        }
    }

    async getIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('chatDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
            };
        });
    }
}

const chatManager = new ChatManager();

// Connection status handling
socket.on('connect', () => {
    updateConnectionStatus(true);
});

socket.on('disconnect', () => {
    updateConnectionStatus(false);
});

socket.on('error', (error) => {
    showNotification(error.message, 'error');
});

// Heartbeat
socket.on('ping', () => {
    socket.emit('pong');
});

function updateConnectionStatus(isConnected) {
    const statusEl = document.getElementById('connection-status');
    const statusText = document.querySelector('.status-text');
    
    statusEl.className = `connection-status ${isConnected ? 'online' : 'offline'}`;
    statusText.textContent = isConnected ? 'Connected' : 'Disconnected';
}

// Chat handling
socket.on('chat_message', (message) => {
    if (currentChatId === message.chatId) {
        appendMessage(message);
    }
    updateUnreadCount(message.chatId);
});

socket.on('typing_status', (data) => {
    const typingIndicator = document.getElementById('typing-indicator');
    typingIndicator.style.display = data.isTyping ? 'block' : 'none';
});

function appendMessage(message) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageEl = document.createElement('div');
    messageEl.className = `message ${message.sender === socket.id ? 'sent' : 'received'}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString();
    messageEl.innerHTML = `
        <div class="message-content">${message.content}</div>
        <div class="message-time">${time}</div>
    `;
    
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Message input handling
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-message');

messageInput.addEventListener('input', () => {
    if (currentChatId) {
        clearTimeout(typingTimer);
        socket.emit('chat_message', {
            chatId: currentChatId,
            isTyping: true
        });

        typingTimer = setTimeout(() => {
            socket.emit('chat_message', {
                chatId: currentChatId,
                isTyping: false
            });
        }, 1000);
    }
});

sendButton.addEventListener('click', () => {
    chatManager.sendMessage(currentChatId, messageInput.value);
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatManager.sendMessage(currentChatId, messageInput.value);
    }
});

// Quick responses
const quickResponseSelect = document.getElementById('quick-response-select');
quickResponseSelect.addEventListener('change', () => {
    if (quickResponseSelect.value) {
        messageInput.value = quickResponseSelect.value;
        quickResponseSelect.value = '';
        messageInput.focus();
    }
});

// Agent status handling
const agentStatusSelect = document.getElementById('agent-status');
agentStatusSelect.addEventListener('change', () => {
    socket.emit('agent_status', { status: agentStatusSelect.value });
    showNotification(`Status updated to ${agentStatusSelect.value}`, 'success');
});

// Notifications
function showNotification(message, type = 'info') {
    notifications.show(message, { type });
}

// Search functionality
const globalSearch = document.getElementById('global-search');
globalSearch.addEventListener('input', debounce(handleSearch, 300));

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    // Implement search logic here
}

// Initialize dashboard
function initDashboard() {
    updateStats();
    loadQuickResponses();
    setInterval(updateStats, 30000);
}

// Start the dashboard
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    setupEventListeners();
});

// Initialize all charts
function initializeCharts() {
    // Failed Login Attempts Chart
    const failedLoginCtx = document.getElementById('failed-login-attempts-chart').getContext('2d');
    new Chart(failedLoginCtx, {
        ...chartConfig,
        data: {
            labels: Array(10).fill(''),
            datasets: [{
                data: mockData.failedLogins.data,
                borderColor: '#f44336',
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                fill: true
            }]
        }
    });

    // Active Sessions Chart
    const activeSessionsCtx = document.getElementById('active-sessions-chart').getContext('2d');
    new Chart(activeSessionsCtx, {
        ...chartConfig,
        data: {
            labels: Array(10).fill(''),
            datasets: [{
                data: mockData.activeSessions.data,
                borderColor: '#2196f3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                fill: true
            }]
        }
    });

    // Security Alerts Chart
    const securityAlertsCtx = document.getElementById('security-alerts-chart').getContext('2d');
    new Chart(securityAlertsCtx, {
        ...chartConfig,
        data: {
            labels: Array(10).fill(''),
            datasets: [{
                data: mockData.securityAlerts.data,
                borderColor: '#ff9800',
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                fill: true
            }]
        }
    });

    // 2FA Usage Chart
    const twoFactorCtx = document.getElementById('two-factor-usage-chart').getContext('2d');
    new Chart(twoFactorCtx, {
        ...chartConfig,
        data: {
            labels: Array(10).fill(''),
            datasets: [{
                data: mockData.twoFactorUsage.data,
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true
            }]
        }
    });
}

// Set up event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.nav-menu li').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Refresh button
    document.getElementById('refreshData').addEventListener('click', () => {
        loadDashboardData();
    });

    // Time range selector
    document.getElementById('timeRange').addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            showDateRangePicker();
        } else {
            loadDashboardData(e.target.value);
        }
    });

    // Alert severity filter
    document.getElementById('alertSeverity').addEventListener('change', (e) => {
        filterSecurityAlerts(e.target.value);
    });

    // Load more alerts
    document.getElementById('loadMoreAlerts').addEventListener('click', loadMoreAlerts);

    // Map view selector
    document.getElementById('mapView').addEventListener('change', (e) => {
        updateActivityMap(e.target.value);
    });

    // Expand map button
    document.getElementById('expandMap').addEventListener('click', toggleMapFullscreen);

    // Modal close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(btn.closest('.modal').id);
        });
    });

    // Network status monitoring
    window.addEventListener('online', () => {
        notifications.show('Back online');
        chatManager.syncOfflineMessages();
    });

    window.addEventListener('offline', () => {
        notifications.show('You are offline', { type: 'error' });
    });

    // Performance monitoring
    window.addEventListener('load', () => {
        if ('performance' in window) {
            const timing = performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            console.log(`Page load time: ${loadTime}ms`);
        }
    });
}

// Load dashboard data
function loadDashboardData(timeRange = '24h') {
    // Update stats
    document.getElementById('failed-login-attempts').textContent = mockData.failedLogins.count;
    document.getElementById('active-sessions').textContent = mockData.activeSessions.count;
    document.getElementById('security-alerts').textContent = mockData.securityAlerts.count;
    document.getElementById('two-factor-usage').textContent = mockData.twoFactorUsage.percentage + '%';

    // Update last updated timestamp
    document.getElementById('lastUpdated').textContent = moment().format('MMM D, YYYY h:mm A');

    // Load security alerts
    loadSecurityAlerts();

    // Update activity map
    updateActivityMap(document.getElementById('mapView').value);
}

// Load security alerts
function loadSecurityAlerts() {
    const alerts = [
        {
            level: 'high',
            message: 'Multiple failed login attempts detected from IP 192.168.1.100',
            time: '5 minutes ago'
        },
        {
            level: 'medium',
            message: 'Unusual login pattern detected for user admin@18kchat.com',
            time: '15 minutes ago'
        },
        {
            level: 'low',
            message: 'New device login for user support@18kchat.com',
            time: '1 hour ago'
        }
    ];

    const alertsList = document.getElementById('security-alerts-list');
    alertsList.innerHTML = alerts.map(alert => `
        <div class="alert-item ${alert.level}">
            <div class="alert-header">
                <span class="alert-level">${alert.level.toUpperCase()}</span>
                <span class="alert-time">${alert.time}</span>
            </div>
            <div class="alert-message">${alert.message}</div>
        </div>
    `).join('');
}

// Filter security alerts
function filterSecurityAlerts(severity) {
    const alerts = document.querySelectorAll('.alert-item');
    alerts.forEach(alert => {
        if (severity === 'all' || alert.classList.contains(severity)) {
            alert.style.display = 'block';
        } else {
            alert.style.display = 'none';
        }
    });
}

// Load more alerts
function loadMoreAlerts() {
    // Implement pagination logic here
    console.log('Loading more alerts...');
}

// Update activity map
function updateActivityMap(viewType) {
    // Implement map update logic here
    console.log('Updating map view:', viewType);
}

// Toggle map fullscreen
function toggleMapFullscreen() {
    const mapContainer = document.querySelector('.activity-map');
    mapContainer.classList.toggle('fullscreen');
}

// Show details modal
function showDetails(type) {
    const modal = document.getElementById('detailsModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');

    // Set modal content based on type
    switch (type) {
        case 'failed-logins':
            modalTitle.textContent = 'Failed Login Attempts Details';
            // Add detailed content
            break;
        case 'active-sessions':
            modalTitle.textContent = 'Active Sessions Details';
            // Add detailed content
            break;
        case 'security-alerts':
            modalTitle.textContent = 'Security Alerts Details';
            // Add detailed content
            break;
        case '2fa-usage':
            modalTitle.textContent = '2FA Usage Details';
            // Add detailed content
            break;
    }

    modal.style.display = 'block';
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Switch tab
function switchTab(tabId) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.nav-menu li').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add active class to selected tab and content
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

// Start realtime updates
function startRealtimeUpdates() {
    setInterval(() => {
        // Simulate realtime data updates
        mockData.failedLogins.count += Math.floor(Math.random() * 3);
        mockData.activeSessions.count += Math.floor(Math.random() * 5) - 2;
        mockData.securityAlerts.count += Math.random() > 0.7 ? 1 : 0;
        mockData.twoFactorUsage.percentage = Math.min(100, mockData.twoFactorUsage.percentage + (Math.random() > 0.8 ? 1 : 0));

        // Update the dashboard
        loadDashboardData();
    }, 30000); // Update every 30 seconds
}

// Show date range picker
function showDateRangePicker() {
    // Implement date range picker logic here
    console.log('Showing date range picker...');
}

// Import API service
import apiService from './api-service.js';

// Initialize admin dashboard
class AdminDashboard {
    constructor() {
        this.initializeWebSocket();
        this.setupEventListeners();
        this.loadDashboardStats();
        this.startPerformanceMonitoring();
    }

    async initializeWebSocket() {
        try {
            const token = localStorage.getItem('token');
            this.socket = io(window.location.origin, {
                auth: { token },
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5
            });

            this.socket.on('connect', () => {
                console.log('WebSocket connected');
                this.updateConnectionStatus('connected');
            });

            this.socket.on('disconnect', () => {
                console.log('WebSocket disconnected');
                this.updateConnectionStatus('disconnected');
            });

            this.socket.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.showError('WebSocket connection error');
            });

            this.socket.on('stats_update', (stats) => {
                this.updateDashboardStats(stats);
            });
        } catch (error) {
            console.error('WebSocket initialization error:', error);
            this.showError('Failed to initialize WebSocket connection');
        }
    }

    setupEventListeners() {
        // Add event listeners for dashboard controls
        document.getElementById('refreshStats').addEventListener('click', () => {
            this.loadDashboardStats();
        });

        // Add more event listeners as needed
    }

    async loadDashboardStats() {
        try {
            const stats = await apiService.getDashboardStats();
            this.updateDashboardStats(stats);
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
            this.showError('Failed to load dashboard statistics');
        }
    }

    updateDashboardStats(stats) {
        // Update UI with new stats
        document.getElementById('activeUsers').textContent = stats.activeUsers;
        document.getElementById('totalChats').textContent = stats.totalChats;
        document.getElementById('activeAgents').textContent = stats.activeAgents;
        // Update more stats as needed
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        statusElement.textContent = status;
        statusElement.className = `status-${status}`;
    }

    startPerformanceMonitoring() {
        setInterval(async () => {
            try {
                const response = await fetch('/health');
                const health = await response.json();
                this.updatePerformanceMetrics(health);
            } catch (error) {
                console.error('Health check failed:', error);
            }
        }, 30000); // Check every 30 seconds
    }

    updatePerformanceMetrics(health) {
        // Update performance metrics in UI
        document.getElementById('memoryUsage').textContent = 
            `${Math.round(health.memory.heapUsed / 1024 / 1024)}MB`;
        document.getElementById('uptime').textContent = 
            `${Math.round(health.uptime / 1000 / 60)}m`;
        
        // Update database status
        const dbStatus = document.getElementById('databaseStatus');
        dbStatus.textContent = health.database.mongodb.status;
        dbStatus.className = `status-${health.database.mongodb.status}`;
        
        // Update Redis status
        const redisStatus = document.getElementById('redisStatus');
        redisStatus.textContent = health.database.redis.status;
        redisStatus.className = `status-${health.database.redis.status}`;
    }

    showError(message) {
        const errorContainer = document.getElementById('errorContainer');
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
});
