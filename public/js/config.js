// Server Configuration
const SERVER_CONFIG = {
    // Server URLs - force HTTP for local development
    SERVER_URL: 'http://' + (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? '127.0.0.1:8000'
        : window.location.hostname),
    
    // WebSocket Configuration - force WS for local development
    SOCKET_URL: 'ws://' + (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? '127.0.0.1:8000'
        : window.location.hostname),
    
    // API Endpoints
    API: {
        AUTH: '/api/auth',
        USERS: '/api/users',
        CHAT: '/api/chat',
        CONTENT: '/api/content',
        SETTINGS: '/api/settings'
    },
    
    // Feature Flags
    FEATURES: {
        ENABLE_NOTIFICATIONS: true,
        ENABLE_FILE_SHARING: true,
        ENABLE_VIDEO_CHAT: false,
        ENABLE_VOICE_CHAT: false
    }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SERVER_CONFIG;
}
