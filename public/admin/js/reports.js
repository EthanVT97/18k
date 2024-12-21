// Reports Management JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize reports
    initializeReports();

    // Add event listeners
    addEventListeners();

    // Load initial data
    loadReportData('financial');
});

function initializeReports() {
    // Initialize charts
    initializeCharts();
}

function addEventListeners() {
    // Report tab navigation
    const reportTabs = document.querySelectorAll('.report-tab');
    reportTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            reportTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');

            // Hide all report sections
            const sections = document.querySelectorAll('.report-section');
            sections.forEach(s => s.classList.remove('active'));

            // Show selected section
            const targetSection = document.getElementById(`${tab.dataset.report}-reports`);
            if (targetSection) {
                targetSection.classList.add('active');
                loadReportData(tab.dataset.report);
            }
        });
    });

    // Date range picker
    const dateRange = document.getElementById('dateRange');
    if (dateRange) {
        dateRange.addEventListener('change', () => {
            const activeTab = document.querySelector('.report-tab.active');
            if (activeTab) {
                loadReportData(activeTab.dataset.report);
            }
        });
    }

    // Export button
    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExport);
    }

    // Schedule button
    const scheduleBtn = document.querySelector('.schedule-btn');
    if (scheduleBtn) {
        scheduleBtn.addEventListener('click', showScheduleModal);
    }

    // Schedule form
    const scheduleForm = document.getElementById('scheduleForm');
    if (scheduleForm) {
        scheduleForm.addEventListener('submit', handleScheduleSubmit);
    }
}

function initializeCharts() {
    // Revenue Trend Chart
    const revenueTrendCtx = document.getElementById('revenueTrendChart');
    if (revenueTrendCtx) {
        new Chart(revenueTrendCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Revenue',
                    data: [12000, 19000, 15000, 25000, 22000, 30000],
                    borderColor: '#4CAF50',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    // Payment Methods Chart
    const paymentMethodsCtx = document.getElementById('paymentMethodsChart');
    if (paymentMethodsCtx) {
        new Chart(paymentMethodsCtx, {
            type: 'doughnut',
            data: {
                labels: ['Credit Card', 'Bank Transfer', 'E-Wallet', 'Crypto'],
                datasets: [{
                    data: [45, 25, 20, 10],
                    backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#9C27B0']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    // User Activity Chart
    const userActivityCtx = document.getElementById('userActivityChart');
    if (userActivityCtx) {
        new Chart(userActivityCtx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Active Users',
                    data: [1200, 1900, 1500, 2500, 2200, 3000, 2800],
                    backgroundColor: '#2196F3'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    // Game Popularity Chart
    const gamePopularityCtx = document.getElementById('gamePopularityChart');
    if (gamePopularityCtx) {
        new Chart(gamePopularityCtx, {
            type: 'bar',
            data: {
                labels: ['Game 1', 'Game 2', 'Game 3', 'Game 4', 'Game 5'],
                datasets: [{
                    label: 'Players',
                    data: [500, 400, 300, 200, 100],
                    backgroundColor: '#FFC107'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y'
            }
        });
    }

    // Initialize other charts...
}

function loadReportData(reportType) {
    const dateRange = document.getElementById('dateRange').value;
    
    // Show loading state
    showLoading();

    // Simulated API call
    setTimeout(() => {
        switch (reportType) {
            case 'financial':
                loadFinancialData(dateRange);
                break;
            case 'user':
                loadUserData(dateRange);
                break;
            case 'game':
                loadGameData(dateRange);
                break;
            case 'promotion':
                loadPromotionData(dateRange);
                break;
        }
        
        // Hide loading state
        hideLoading();
    }, 1000);
}

function loadFinancialData(dateRange) {
    // Simulated financial data
    const data = {
        summary: {
            grossRevenue: 125678,
            netProfit: 45890,
            totalBets: 789012,
            payoutRatio: 94.3
        },
        transactions: [
            {
                date: '2024-01-01',
                deposits: 50000,
                withdrawals: 30000,
                bets: 100000,
                wins: 95000,
                netRevenue: 25000
            },
            // Add more transaction data...
        ]
    };

    updateFinancialDashboard(data);
}

function loadUserData(dateRange) {
    // Simulated user data
    const data = {
        summary: {
            activeUsers: 1234,
            newUsers: 156,
            avgSessionTime: 45,
            retentionRate: 68
        },
        segments: [
            {
                name: 'VIP Users',
                count: 123,
                revenueShare: 45
            },
            // Add more segment data...
        ]
    };

    updateUserDashboard(data);
}

function loadGameData(dateRange) {
    // Simulated game data
    const data = {
        summary: {
            totalGames: 245,
            activeGames: 198,
            avgRTP: 96.5,
            totalBets: 52890
        },
        rankings: [
            {
                name: 'Game 1',
                players: 1000,
                bets: 50000,
                revenue: 5000,
                rtp: 96.5
            },
            // Add more game ranking data...
        ]
    };

    updateGameDashboard(data);
}

function loadPromotionData(dateRange) {
    // Simulated promotion data
    const data = {
        summary: {
            activePromotions: 12,
            totalClaims: 1567,
            bonusCost: 23456,
            roi: 245
        },
        analysis: [
            {
                name: 'Welcome Bonus',
                claims: 500,
                cost: 10000,
                revenue: 25000,
                roi: 250,
                conversion: 65
            },
            // Add more promotion analysis data...
        ]
    };

    updatePromotionDashboard(data);
}

function updateFinancialDashboard(data) {
    // Update summary cards
    updateSummaryCards('financial', data.summary);

    // Update transaction table
    const tableBody = document.querySelector('#financial-reports .report-table tbody');
    if (tableBody) {
        tableBody.innerHTML = data.transactions.map(transaction => `
            <tr>
                <td>${formatDate(transaction.date)}</td>
                <td>$${formatNumber(transaction.deposits)}</td>
                <td>$${formatNumber(transaction.withdrawals)}</td>
                <td>$${formatNumber(transaction.bets)}</td>
                <td>$${formatNumber(transaction.wins)}</td>
                <td>$${formatNumber(transaction.netRevenue)}</td>
            </tr>
        `).join('');
    }

    // Update charts if needed
    updateCharts('financial', data);
}

function updateUserDashboard(data) {
    // Update summary cards
    updateSummaryCards('user', data.summary);

    // Update user segments
    const segmentGrid = document.querySelector('.segment-grid');
    if (segmentGrid) {
        segmentGrid.innerHTML = data.segments.map(segment => `
            <div class="segment-card">
                <h4>${segment.name}</h4>
                <div class="segment-stats">
                    <div class="stat">
                        <label>Count</label>
                        <span>${segment.count}</span>
                    </div>
                    <div class="stat">
                        <label>Revenue Share</label>
                        <span>${segment.revenueShare}%</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Update charts if needed
    updateCharts('user', data);
}

function updateGameDashboard(data) {
    // Update summary cards
    updateSummaryCards('game', data.summary);

    // Update game rankings
    const tableBody = document.querySelector('#game-performance .game-rankings tbody');
    if (tableBody) {
        tableBody.innerHTML = data.rankings.map(game => `
            <tr>
                <td>${game.name}</td>
                <td>${formatNumber(game.players)}</td>
                <td>$${formatNumber(game.bets)}</td>
                <td>$${formatNumber(game.revenue)}</td>
                <td>${game.rtp}%</td>
            </tr>
        `).join('');
    }

    // Update charts if needed
    updateCharts('game', data);
}

function updatePromotionDashboard(data) {
    // Update summary cards
    updateSummaryCards('promotion', data.summary);

    // Update promotion analysis
    const tableBody = document.querySelector('#promotion-impact .promotion-analysis tbody');
    if (tableBody) {
        tableBody.innerHTML = data.analysis.map(promo => `
            <tr>
                <td>${promo.name}</td>
                <td>${formatNumber(promo.claims)}</td>
                <td>$${formatNumber(promo.cost)}</td>
                <td>$${formatNumber(promo.revenue)}</td>
                <td>${promo.roi}%</td>
                <td>${promo.conversion}%</td>
            </tr>
        `).join('');
    }

    // Update charts if needed
    updateCharts('promotion', data);
}

function updateSummaryCards(section, data) {
    const cards = document.querySelectorAll(`#${section}-reports .summary-card`);
    cards.forEach(card => {
        const key = card.querySelector('h3').textContent.toLowerCase().replace(/\s+/g, '');
        const value = data[key];
        if (value !== undefined) {
            const amountElement = card.querySelector('.amount');
            if (amountElement) {
                amountElement.textContent = formatValue(value, key);
            }
        }
    });
}

function handleExport() {
    const activeTab = document.querySelector('.report-tab.active');
    const dateRange = document.getElementById('dateRange').value;
    
    if (activeTab) {
        const reportType = activeTab.dataset.report;
        exportReport(reportType, dateRange);
    }
}

function exportReport(reportType, dateRange) {
    // Implement export logic
    console.log(`Exporting ${reportType} report for ${dateRange}`);
    // Show success message
    showSuccess('Report exported successfully');
}

function showScheduleModal() {
    const modal = document.querySelector('.schedule-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function hideScheduleModal() {
    const modal = document.querySelector('.schedule-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function handleScheduleSubmit(event) {
    event.preventDefault();

    // Get form data
    const formData = new FormData(event.target);
    const scheduleData = Object.fromEntries(formData.entries());

    // Save schedule
    saveSchedule(scheduleData);

    // Hide modal
    hideScheduleModal();

    // Show success message
    showSuccess('Report scheduled successfully');
}

// Utility Functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function formatNumber(number) {
    return number.toLocaleString();
}

function formatValue(value, type) {
    if (typeof value === 'number') {
        if (type.includes('ratio') || type.includes('rate') || type.includes('rtp')) {
            return `${value}%`;
        } else if (type.includes('revenue') || type.includes('profit') || type.includes('cost')) {
            return `$${formatNumber(value)}`;
        }
    }
    return value;
}

function showLoading() {
    // Implement loading state
}

function hideLoading() {
    // Implement loading state removal
}

function showSuccess(message) {
    // Implement success message display
    alert(message);
}

function showError(message) {
    // Implement error message display
    alert(message);
}

// Initialize tooltips, if using a tooltip library
function initializeTooltips() {
    // Implement tooltip initialization
}

// Initialize date range picker, if using a date picker library
function initializeDateRangePicker() {
    // Implement date range picker initialization
}
