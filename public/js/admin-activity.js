// Mock activity data
const mockActivities = [
    {
        id: 1,
        type: 'login',
        user: 'John Doe',
        timestamp: '2024-12-20T23:30:00',
        details: 'Successful login from IP: 192.168.1.100',
        location: { lat: 16.8661, lng: 96.1951 }, // Yangon coordinates
        severity: 'info'
    },
    {
        id: 2,
        type: 'security',
        user: 'System',
        timestamp: '2024-12-20T23:15:00',
        details: 'Failed login attempt detected',
        location: { lat: 16.8661, lng: 96.1951 },
        severity: 'warning'
    },
    {
        id: 3,
        type: 'system',
        user: 'System',
        timestamp: '2024-12-20T23:00:00',
        details: 'System backup completed',
        severity: 'info'
    }
];

let activityMap = null;
let activityMarkers = [];

// Initialize activity monitoring
document.addEventListener('DOMContentLoaded', () => {
    initializeActivityLog();
    initializeActivityMap();
    setupActivityFilters();
    startRealTimeUpdates();
});

// Initialize activity log
function initializeActivityLog() {
    loadActivities();
    updateActivityStats();
}

// Initialize activity map
function initializeActivityMap() {
    activityMap = L.map('activityMap').setView([16.8661, 96.1951], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(activityMap);

    // Add markers for activities with locations
    mockActivities.forEach(activity => {
        if (activity.location) {
            addActivityMarker(activity);
        }
    });
}

// Add marker to map
function addActivityMarker(activity) {
    const marker = L.marker([activity.location.lat, activity.location.lng])
        .bindPopup(`
            <strong>${activity.type}</strong><br>
            ${activity.user}<br>
            ${activity.details}<br>
            ${formatTimestamp(activity.timestamp)}
        `);
    
    activityMarkers.push(marker);
    marker.addTo(activityMap);
}

// Load activities
function loadActivities(filter = '') {
    const activityLog = document.getElementById('activityLog');
    const filteredActivities = mockActivities
        .filter(activity => {
            if (!filter) return true;
            return activity.type === filter || activity.severity === filter;
        })
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    activityLog.innerHTML = filteredActivities.map(activity => `
        <div class="activity-item ${activity.severity}">
            <div class="activity-icon">
                <i class="fas ${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-header">
                    <span class="activity-type">${activity.type}</span>
                    <span class="activity-time">${formatTimestamp(activity.timestamp)}</span>
                </div>
                <div class="activity-details">
                    <strong>${activity.user}</strong>: ${activity.details}
                </div>
                ${activity.location ? `
                    <div class="activity-location">
                        <i class="fas fa-map-marker-alt"></i>
                        Location: ${activity.location.lat.toFixed(4)}, ${activity.location.lng.toFixed(4)}
                    </div>
                ` : ''}
            </div>
            <div class="activity-severity ${activity.severity}">
                <i class="fas ${getSeverityIcon(activity.severity)}"></i>
                ${activity.severity}
            </div>
        </div>
    `).join('');
}

// Set up activity filters
function setupActivityFilters() {
    const typeFilter = document.getElementById('activityTypeFilter');
    const severityFilter = document.getElementById('activitySeverityFilter');

    typeFilter.addEventListener('change', () => {
        loadActivities(typeFilter.value);
    });

    severityFilter.addEventListener('change', () => {
        loadActivities(severityFilter.value);
    });
}

// Update activity statistics
function updateActivityStats() {
    const stats = {
        total: mockActivities.length,
        warnings: mockActivities.filter(a => a.severity === 'warning').length,
        errors: mockActivities.filter(a => a.severity === 'error').length,
        logins: mockActivities.filter(a => a.type === 'login').length
    };

    document.getElementById('totalActivities').textContent = stats.total;
    document.getElementById('warningActivities').textContent = stats.warnings;
    document.getElementById('errorActivities').textContent = stats.errors;
    document.getElementById('loginActivities').textContent = stats.logins;
}

// Start real-time updates
function startRealTimeUpdates() {
    setInterval(() => {
        // Simulate new activity
        const newActivity = generateRandomActivity();
        mockActivities.unshift(newActivity);
        
        if (newActivity.location) {
            addActivityMarker(newActivity);
        }
        
        loadActivities();
        updateActivityStats();
    }, 30000); // Update every 30 seconds
}

// Generate random activity for simulation
function generateRandomActivity() {
    const types = ['login', 'security', 'system'];
    const severities = ['info', 'warning', 'error'];
    const users = ['John Doe', 'Jane Smith', 'System'];

    return {
        id: mockActivities.length + 1,
        type: types[Math.floor(Math.random() * types.length)],
        user: users[Math.floor(Math.random() * users.length)],
        timestamp: new Date().toISOString(),
        details: 'New activity detected',
        location: Math.random() > 0.5 ? { lat: 16.8661 + (Math.random() - 0.5), lng: 96.1951 + (Math.random() - 0.5) } : null,
        severity: severities[Math.floor(Math.random() * severities.length)]
    };
}

// Helper functions
function getActivityIcon(type) {
    switch (type) {
        case 'login': return 'fa-sign-in-alt';
        case 'security': return 'fa-shield-alt';
        case 'system': return 'fa-cogs';
        default: return 'fa-info-circle';
    }
}

function getSeverityIcon(severity) {
    switch (severity) {
        case 'warning': return 'fa-exclamation-triangle';
        case 'error': return 'fa-times-circle';
        default: return 'fa-info-circle';
    }
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Export activity log
function exportActivityLog() {
    const csvContent = mockActivities.map(activity => {
        return `${activity.timestamp},${activity.type},${activity.user},"${activity.details}",${activity.severity}`;
    }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'activity_log.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}
