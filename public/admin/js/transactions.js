// Transactions Management JavaScript

class TransactionManager {
    constructor() {
        this.transactions = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.setupEventListeners();
        this.loadTransactions();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Export button
        const exportBtn = document.querySelector('.export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportTransactions());
        }

        // Filter button
        const filterBtn = document.querySelector('.filter-btn');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => this.showFilterModal());
        }

        // Filter form submission
        const filterForm = document.getElementById('filterForm');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.applyFilters(e.target);
            });
        }

        // Pagination
        document.querySelectorAll('.pagination button').forEach(button => {
            button.addEventListener('click', (e) => {
                if (e.currentTarget.classList.contains('prev-page')) {
                    this.changePage(this.currentPage - 1);
                } else if (e.currentTarget.classList.contains('next-page')) {
                    this.changePage(this.currentPage + 1);
                }
            });
        });
    }

    loadTransactions() {
        // Simulated transaction data - replace with actual API call
        this.transactions = [
            {
                id: 'TRX12345',
                user: {
                    name: 'John Doe',
                    id: 'USER789',
                    avatar: 'https://via.placeholder.com/32'
                },
                type: 'deposit',
                amount: 1000.00,
                status: 'completed',
                date: '2024-12-21 15:30',
                paymentMethod: 'Credit Card (**** 1234)',
                description: 'Deposit via Credit Card',
                timeline: [
                    { time: '15:30', event: 'Transaction Completed' },
                    { time: '15:29', event: 'Payment Processed' },
                    { time: '15:28', event: 'Payment Initiated' }
                ]
            },
            // Add more transaction data...
        ];

        this.renderTransactions();
        this.updateSummary();
    }

    renderTransactions() {
        const tbody = document.querySelector('.transaction-list tbody');
        if (!tbody) return;

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginatedTransactions = this.transactions.slice(start, end);

        tbody.innerHTML = paginatedTransactions.map(trx => `
            <tr>
                <td>${trx.id}</td>
                <td>
                    <div class="user-info">
                        <img src="${trx.user.avatar}" alt="${trx.user.name}">
                        <span>${trx.user.name}</span>
                    </div>
                </td>
                <td><span class="badge ${trx.type}">${trx.type}</span></td>
                <td class="amount">${this.formatAmount(trx.amount, trx.type)}</td>
                <td><span class="status-badge ${trx.status}">${trx.status}</span></td>
                <td>${trx.date}</td>
                <td>
                    <div class="action-buttons">
                        <button onclick="transactionManager.viewTransaction('${trx.id}')" class="view-btn">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${trx.status === 'pending' ? `
                            <button onclick="transactionManager.approveTransaction('${trx.id}')" class="approve-btn">
                                <i class="fas fa-check"></i>
                            </button>
                            <button onclick="transactionManager.rejectTransaction('${trx.id}')" class="reject-btn">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');

        this.updatePagination();
    }

    updateSummary() {
        const deposits = this.transactions
            .filter(t => t.type === 'deposit' && t.status === 'completed')
            .reduce((sum, t) => sum + t.amount, 0);

        const withdrawals = this.transactions
            .filter(t => t.type === 'withdrawal' && t.status === 'completed')
            .reduce((sum, t) => sum + t.amount, 0);

        const pending = this.transactions
            .filter(t => t.status === 'pending').length;

        // Update summary cards
        document.querySelector('.summary-card:nth-child(1) .amount').textContent = 
            this.formatAmount(deposits);
        document.querySelector('.summary-card:nth-child(2) .amount').textContent = 
            this.formatAmount(withdrawals);
        document.querySelector('.summary-card:nth-child(3) .amount').textContent = 
            this.formatAmount(deposits - withdrawals);
        document.querySelector('.summary-card:nth-child(4) .amount').textContent = 
            pending.toString();
    }

    updatePagination() {
        const totalPages = Math.ceil(this.transactions.length / this.itemsPerPage);
        const paginationDiv = document.querySelector('.pagination .page-numbers');
        if (!paginationDiv) return;

        let pages = [];
        if (totalPages <= 5) {
            pages = Array.from({length: totalPages}, (_, i) => i + 1);
        } else {
            if (this.currentPage <= 3) {
                pages = [1, 2, 3, '...', totalPages];
            } else if (this.currentPage >= totalPages - 2) {
                pages = [1, '...', totalPages - 2, totalPages - 1, totalPages];
            } else {
                pages = [1, '...', this.currentPage, '...', totalPages];
            }
        }

        paginationDiv.innerHTML = pages.map(page => 
            typeof page === 'number' 
                ? `<span class="${page === this.currentPage ? 'current' : ''}">${page}</span>`
                : `<span>${page}</span>`
        ).join('');
    }

    changePage(newPage) {
        const totalPages = Math.ceil(this.transactions.length / this.itemsPerPage);
        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.renderTransactions();
        }
    }

    handleSearch(query) {
        if (!query) {
            this.loadTransactions();
            return;
        }

        const searchQuery = query.toLowerCase();
        this.transactions = this.transactions.filter(trx => 
            trx.id.toLowerCase().includes(searchQuery) ||
            trx.user.name.toLowerCase().includes(searchQuery) ||
            trx.type.toLowerCase().includes(searchQuery)
        );

        this.currentPage = 1;
        this.renderTransactions();
        this.updateSummary();
    }

    showFilterModal() {
        const modal = document.querySelector('.filter-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    applyFilters(form) {
        const formData = new FormData(form);
        const filters = {
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            type: formData.get('type'),
            status: formData.get('status'),
            minAmount: formData.get('minAmount'),
            maxAmount: formData.get('maxAmount')
        };

        this.transactions = this.transactions.filter(trx => {
            const date = new Date(trx.date);
            return (
                (!filters.startDate || date >= new Date(filters.startDate)) &&
                (!filters.endDate || date <= new Date(filters.endDate)) &&
                (filters.type === 'all' || trx.type === filters.type) &&
                (filters.status === 'all' || trx.status === filters.status) &&
                (!filters.minAmount || trx.amount >= filters.minAmount) &&
                (!filters.maxAmount || trx.amount <= filters.maxAmount)
            );
        });

        this.currentPage = 1;
        this.renderTransactions();
        this.updateSummary();

        // Close modal
        document.querySelector('.filter-modal').style.display = 'none';
    }

    viewTransaction(transactionId) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) return;

        const modal = document.querySelector('.transaction-modal');
        if (!modal) return;

        // Update modal content with transaction details
        modal.querySelector('.transaction-details .detail-group:nth-child(1) span').textContent = transaction.id;
        modal.querySelector('.transaction-details .detail-group:nth-child(2) span').textContent = 
            `${transaction.user.name} (#${transaction.user.id})`;
        modal.querySelector('.transaction-details .detail-group:nth-child(3) span').className = 
            `badge ${transaction.type}`;
        modal.querySelector('.transaction-details .detail-group:nth-child(3) span').textContent = 
            transaction.type;
        modal.querySelector('.transaction-details .detail-group:nth-child(4) span').textContent = 
            this.formatAmount(transaction.amount);
        modal.querySelector('.transaction-details .detail-group:nth-child(5) span').className = 
            `status-badge ${transaction.status}`;
        modal.querySelector('.transaction-details .detail-group:nth-child(5) span').textContent = 
            transaction.status;
        modal.querySelector('.transaction-details .detail-group:nth-child(6) span').textContent = 
            transaction.paymentMethod;
        modal.querySelector('.transaction-details .detail-group:nth-child(7) span').textContent = 
            transaction.date;
        modal.querySelector('.transaction-details .detail-group:nth-child(8) span').textContent = 
            transaction.description;

        // Update timeline
        const timeline = modal.querySelector('.timeline');
        timeline.innerHTML = transaction.timeline.map(item => `
            <div class="timeline-item">
                <div class="time">${item.time}</div>
                <div class="event">${item.event}</div>
            </div>
        `).join('');

        // Show/hide action buttons based on status
        const approveBtn = modal.querySelector('.approve-transaction');
        const rejectBtn = modal.querySelector('.reject-transaction');
        if (approveBtn && rejectBtn) {
            const isPending = transaction.status === 'pending';
            approveBtn.style.display = isPending ? 'block' : 'none';
            rejectBtn.style.display = isPending ? 'block' : 'none';
        }

        modal.style.display = 'block';
    }

    approveTransaction(transactionId) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (transaction && transaction.status === 'pending') {
            transaction.status = 'completed';
            transaction.timeline.unshift({
                time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                event: 'Transaction Approved'
            });
            this.renderTransactions();
            this.updateSummary();
        }
    }

    rejectTransaction(transactionId) {
        if (confirm('Are you sure you want to reject this transaction?')) {
            const transaction = this.transactions.find(t => t.id === transactionId);
            if (transaction && transaction.status === 'pending') {
                transaction.status = 'rejected';
                transaction.timeline.unshift({
                    time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                    event: 'Transaction Rejected'
                });
                this.renderTransactions();
                this.updateSummary();
            }
        }
    }

    exportTransactions() {
        const csv = [
            ['Transaction ID', 'User', 'Type', 'Amount', 'Status', 'Date', 'Payment Method'],
            ...this.transactions.map(trx => [
                trx.id,
                trx.user.name,
                trx.type,
                this.formatAmount(trx.amount),
                trx.status,
                trx.date,
                trx.paymentMethod
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transactions.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    formatAmount(amount, type = 'deposit') {
        const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(Math.abs(amount));

        return type === 'withdrawal' ? `-${formatted}` : `+${formatted}`;
    }
}

// Initialize Transaction Manager
const transactionManager = new TransactionManager();

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Close button functionality
document.querySelectorAll('.close-modal').forEach(button => {
    button.addEventListener('click', () => {
        button.closest('.modal').style.display = 'none';
    });
});
