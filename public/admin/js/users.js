// Users Management JavaScript

class UserManager {
    constructor() {
        this.users = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.setupEventListeners();
        this.loadUsers();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Add new user button
        const addUserBtn = document.querySelector('.add-user-btn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.showAddUserModal());
        }

        // Filter buttons
        const applyFiltersBtn = document.querySelector('.apply-filters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFilters());
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

    loadUsers() {
        // Simulated user data - replace with actual API call
        this.users = [
            {
                id: '12345',
                name: 'John Doe',
                email: 'john@example.com',
                role: 'user',
                balance: 2500,
                status: 'active',
                lastLogin: '2024-12-21 15:30',
                avatar: 'https://via.placeholder.com/40'
            },
            // Add more user data...
        ];

        this.renderUsers();
    }

    renderUsers() {
        const tbody = document.querySelector('.users-table tbody');
        if (!tbody) return;

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginatedUsers = this.users.slice(start, end);

        tbody.innerHTML = paginatedUsers.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>
                    <div class="user-info">
                        <img src="${user.avatar}" alt="${user.name}">
                        <div>
                            <div class="user-name">${user.name}</div>
                            <div class="user-email">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td><span class="role-badge ${user.role}">${user.role}</span></td>
                <td>$${user.balance.toLocaleString()}</td>
                <td><span class="status-badge ${user.status}">${user.status}</span></td>
                <td>${user.lastLogin}</td>
                <td>
                    <div class="action-buttons">
                        <button onclick="userManager.viewUser('${user.id}')" class="view-btn">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="userManager.editUser('${user.id}')" class="edit-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="userManager.deleteUser('${user.id}')" class="delete-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        this.updatePagination();
    }

    updatePagination() {
        const totalPages = Math.ceil(this.users.length / this.itemsPerPage);
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
        const totalPages = Math.ceil(this.users.length / this.itemsPerPage);
        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.renderUsers();
        }
    }

    handleSearch(query) {
        if (!query) {
            this.loadUsers();
            return;
        }

        const searchQuery = query.toLowerCase();
        this.users = this.users.filter(user => 
            user.name.toLowerCase().includes(searchQuery) ||
            user.email.toLowerCase().includes(searchQuery) ||
            user.id.toLowerCase().includes(searchQuery)
        );

        this.currentPage = 1;
        this.renderUsers();
    }

    applyFilters() {
        const status = document.getElementById('statusFilter').value;
        const role = document.getElementById('roleFilter').value;
        const date = document.getElementById('dateFilter').value;

        this.users = this.users.filter(user => {
            let matchStatus = status === 'all' || user.status === status;
            let matchRole = role === 'all' || user.role === role;
            let matchDate = !date || user.lastLogin.includes(date);

            return matchStatus && matchRole && matchDate;
        });

        this.currentPage = 1;
        this.renderUsers();
    }

    viewUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const modal = document.querySelector('.user-details-modal');
        if (!modal) return;

        // Update modal content with user details
        modal.querySelector('.profile-info h3').textContent = user.name;
        modal.querySelector('.user-id').textContent = `#${user.id}`;
        modal.querySelector('.user-status').className = `user-status ${user.status}`;
        modal.querySelector('.user-status').textContent = user.status;

        // Show modal
        modal.style.display = 'block';
    }

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        // Implement edit user functionality
        console.log('Editing user:', userId);
    }

    deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            this.users = this.users.filter(u => u.id !== userId);
            this.renderUsers();
        }
    }

    showAddUserModal() {
        // Implement add user modal
        console.log('Showing add user modal');
    }
}

// Initialize User Manager
const userManager = new UserManager();

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
