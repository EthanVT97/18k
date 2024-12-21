// Admin Dashboard JavaScript

// Utility Functions
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
};

const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
};

const formatDate = (date) => {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
        Math.round((new Date(date) - new Date()) / (1000 * 60)), 'minute'
    );
};

// Download Functions
const downloadData = async (type, format = 'csv') => {
    try {
        let data;
        let filename;
        
        switch (type) {
            case 'users':
                data = await fetchUsers();
                filename = `users_${formatDateForFilename(new Date())}`;
                break;
            case 'transactions':
                data = await fetchTransactions();
                filename = `transactions_${formatDateForFilename(new Date())}`;
                break;
            case 'reports':
                data = await fetchReports();
                filename = `reports_${formatDateForFilename(new Date())}`;
                break;
            case 'games':
                data = await fetchGames();
                filename = `games_${formatDateForFilename(new Date())}`;
                break;
            default:
                throw new Error('Invalid download type');
        }

        if (format === 'csv') {
            downloadCSV(data, filename);
        } else if (format === 'json') {
            downloadJSON(data, filename);
        } else if (format === 'pdf') {
            await generatePDF(data, filename);
        }
    } catch (error) {
        console.error('Error downloading data:', error);
        showNotification('error', 'Failed to download data. Please try again.');
    }
};

const formatDateForFilename = (date) => {
    return date.toISOString().split('T')[0];
};

const downloadCSV = (data, filename) => {
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const downloadJSON = (data, filename) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const generatePDF = async (data, filename) => {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(16);
        doc.text(filename, 20, 20);
        
        // Add data
        doc.setFontSize(12);
        let y = 40;
        
        if (Array.isArray(data)) {
            data.forEach((item, index) => {
                if (y > 280) {
                    doc.addPage();
                    y = 20;
                }
                doc.text(JSON.stringify(item), 20, y);
                y += 10;
            });
        } else {
            doc.text(JSON.stringify(data), 20, y);
        }
        
        // Save PDF
        doc.save(`${filename}.pdf`);
    } catch (error) {
        console.error('Error generating PDF:', error);
        showNotification('error', 'Failed to generate PDF. Please try again.');
    }
};

const convertToCSV = (data) => {
    if (!Array.isArray(data)) {
        data = [data];
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header];
            return typeof val === 'string' ? `"${val}"` : val;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
};

// Notification Function
const showNotification = (type, message) => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
};

// Data Fetching Functions
async function fetchUsers() {
    const response = await fetch(`${SERVER_CONFIG.SERVER_URL}/api/users`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
}

async function fetchTransactions() {
    const response = await fetch(`${SERVER_CONFIG.SERVER_URL}/api/transactions`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
}

async function fetchReports() {
    const response = await fetch(`${SERVER_CONFIG.SERVER_URL}/api/reports`);
    if (!response.ok) throw new Error('Failed to fetch reports');
    return response.json();
}

async function fetchGames() {
    const response = await fetch(`${SERVER_CONFIG.SERVER_URL}/api/games`);
    if (!response.ok) throw new Error('Failed to fetch games');
    return response.json();
}

// Dashboard Data Management
class DashboardManager {
    constructor() {
        this.stats = {
            users: 15687,
            revenue: 258947,
            activeChats: 247,
            transactions: 1856
        };
        this.revenueData = {
            daily: [30000, 45000, 35000, 50000, 48000, 60000],
            weekly: [150000, 180000, 200000, 190000],
            monthly: [800000, 950000, 1000000, 1100000, 980000, 1200000]
        };
        this.userActivityData = {
            daily: [1200, 1900, 1500, 1800, 2000, 1700, 1600],
            weekly: [8500, 9200, 8800, 9500],
            monthly: [35000, 38000, 42000, 39000, 41000, 45000]
        };
        this.initializeCharts();
        this.setupEventListeners();
        this.startAutoRefresh();
    }

    // Initialize Charts
    initializeCharts() {
        // Revenue Chart
        this.revenueChart = new Chart(document.getElementById('revenueChart').getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Revenue',
                    data: this.revenueData.monthly,
                    borderColor: '#4CAF50',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(76, 175, 80, 0.1)'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => formatCurrency(context.raw)
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    },
                    x: { grid: { display: false } }
                }
            }
        });

        // User Activity Chart
        this.userActivityChart = new Chart(document.getElementById('userActivityChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Active Users',
                    data: this.userActivityData.daily,
                    backgroundColor: '#2196F3',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => formatNumber(context.raw) + ' users'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            callback: (value) => formatNumber(value)
                        }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // Update Charts
    updateCharts(period = 'daily') {
        this.revenueChart.data.datasets[0].data = this.revenueData[period];
        this.userActivityChart.data.datasets[0].data = this.userActivityData[period];
        
        this.revenueChart.update();
        this.userActivityChart.update();
    }

    // Setup Event Listeners
    setupEventListeners() {
        // Chart Period Buttons
        document.querySelectorAll('.chart-period').forEach(button => {
            button.addEventListener('click', (e) => {
                const period = e.target.textContent.toLowerCase();
                document.querySelectorAll('.chart-period').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
                this.updateCharts(period);
            });
        });

        // Table Actions
        document.querySelectorAll('.action-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.currentTarget.classList.contains('view') ? 'view' :
                             e.currentTarget.classList.contains('edit') ? 'edit' : 'delete';
                const userId = e.currentTarget.closest('tr').querySelector('td:first-child').textContent;
                this.handleTableAction(action, userId);
            });
        });

        // Export Button
        document.querySelector('.export-btn')?.addEventListener('click', () => {
            this.exportTableData();
        });

        // Filter Button
        document.querySelector('.filter-btn')?.addEventListener('click', () => {
            this.showFilterDialog();
        });

        // Search Functionality
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Notification Actions
        document.querySelector('.mark-all-read')?.addEventListener('click', () => {
            this.markAllNotificationsAsRead();
        });
    }

    // Handle Table Actions
    handleTableAction(action, userId) {
        switch(action) {
            case 'view':
                this.showUserDetails(userId);
                break;
            case 'edit':
                this.showEditUserDialog(userId);
                break;
            case 'delete':
                this.showDeleteConfirmation(userId);
                break;
        }
    }

    // User Management Functions
    showUserDetails(userId) {
        // Create and show modal with user details
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>User Details - ${userId}</h2>
                <div class="user-details">
                    <p><strong>Name:</strong> John Doe</p>
                    <p><strong>Email:</strong> john@example.com</p>
                    <p><strong>Balance:</strong> $2,500</p>
                    <p><strong>Status:</strong> Active</p>
                </div>
                <button onclick="this.closest('.modal').remove()">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showEditUserDialog(userId) {
        // Create and show edit user modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Edit User - ${userId}</h2>
                <form id="editUserForm">
                    <input type="text" placeholder="Name" value="John Doe">
                    <input type="email" placeholder="Email" value="john@example.com">
                    <input type="number" placeholder="Balance" value="2500">
                    <select>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                    </select>
                    <button type="submit">Save Changes</button>
                    <button type="button" onclick="this.closest('.modal').remove()">Cancel</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showDeleteConfirmation(userId) {
        if (confirm(`Are you sure you want to delete user ${userId}?`)) {
            // Handle user deletion
            console.log(`Deleting user ${userId}`);
        }
    }

    // Export Table Data
    exportTableData() {
        const table = document.querySelector('table');
        const rows = Array.from(table.querySelectorAll('tr'));
        
        let csv = [];
        rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            const rowData = cells.map(cell => cell.textContent.trim());
            csv.push(rowData.join(','));
        });

        const csvContent = 'data:text/csv;charset=utf-8,' + csv.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'users_data.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Filter Dialog
    showFilterDialog() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Filter Users</h2>
                <form id="filterForm">
                    <select name="status">
                        <option value="">All Status</option>
                        <option value="online">Online</option>
                        <option value="away">Away</option>
                        <option value="offline">Offline</option>
                    </select>
                    <input type="number" name="minBalance" placeholder="Min Balance">
                    <input type="number" name="maxBalance" placeholder="Max Balance">
                    <button type="submit">Apply Filters</button>
                    <button type="button" onclick="this.closest('.modal').remove()">Cancel</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Search Functionality
    handleSearch(query) {
        const rows = document.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
        });
    }

    // Notification Management
    markAllNotificationsAsRead() {
        document.querySelectorAll('.notification-item.unread').forEach(item => {
            item.classList.remove('unread');
        });
        document.querySelector('.badge').textContent = '0';
    }

    // Auto Refresh Data
    startAutoRefresh() {
        setInterval(() => {
            this.refreshData();
        }, 30000); // Refresh every 30 seconds
    }

    refreshData() {
        // Simulate data update
        this.stats.activeChats = Math.floor(Math.random() * 300) + 200;
        this.stats.transactions = Math.floor(Math.random() * 2000) + 1500;
        
        // Update display
        document.querySelector('.stat-card:nth-child(3) .stat-number').textContent = formatNumber(this.stats.activeChats);
        document.querySelector('.stat-card:nth-child(4) .stat-number').textContent = formatNumber(this.stats.transactions);
    }
}

// API Functions
async function fetchDashboardData() {
    try {
        const response = await fetch(`${SERVER_CONFIG.SERVER_URL}/api/admin/dashboard`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
        }
        
        const data = await response.json();
        updateDashboardUI(data);
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }
}

function updateDashboardUI(data) {
    // Update statistics
    document.querySelector('.stat-value.users').textContent = data.totalUsers.toLocaleString();
    document.querySelector('.stat-value.revenue').textContent = formatCurrency(data.totalRevenue);
    document.querySelector('.stat-value.chats').textContent = data.activeChats.toLocaleString();
    document.querySelector('.stat-value.transactions').textContent = data.totalTransactions.toLocaleString();
    
    // Update charts
    // ... chart update logic ...
}

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new DashboardManager();
    fetchDashboardData();
    
    // Add event listeners for download buttons
    document.querySelectorAll('[data-download]').forEach(button => {
        button.addEventListener('click', (e) => {
            const type = e.target.dataset.download;
            const format = e.target.dataset.format || 'csv';
            downloadData(type, format);
        });
    });
});

// Chart Initialization
function initializeCharts() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Revenue',
                data: [30000, 45000, 35000, 50000, 48000, 60000],
                borderColor: '#4CAF50',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(76, 175, 80, 0.1)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    // User Activity Chart
    const userActivityCtx = document.getElementById('userActivityChart').getContext('2d');
    new Chart(userActivityCtx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Active Users',
                data: [1200, 1900, 1500, 1800, 2000, 1700, 1600],
                backgroundColor: '#2196F3',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Event Listeners
function initializeEventListeners() {
    // Sidebar Toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', function() {
        document.querySelector('.sidebar').classList.toggle('collapsed');
        document.querySelector('.main-content').classList.toggle('expanded');
    });

    // Notification Dropdown
    document.querySelector('.notification-btn')?.addEventListener('click', function() {
        document.querySelector('.notification-dropdown').classList.toggle('show');
    });

    // Close notification dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.notifications')) {
            document.querySelector('.notification-dropdown')?.classList.remove('show');
        }
    });
}

// Add these styles to handle modals
const style = document.createElement('style');
style.textContent = `
    .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .modal-content {
        background: white;
        padding: 20px;
        border-radius: 8px;
        min-width: 300px;
    }

    .modal-content h2 {
        margin-bottom: 15px;
    }

    .modal-content form {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .modal-content input,
    .modal-content select {
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
    }

    .modal-content button {
        padding: 8px 15px;
        border: none;
        border-radius: 4px;
        background: #2196F3;
        color: white;
        cursor: pointer;
    }

    .modal-content button[type="button"] {
        background: #666;
    }
`;
document.head.appendChild(style);
