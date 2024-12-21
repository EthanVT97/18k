// User Management JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const addUserBtn = document.getElementById('addUserBtn');
    const userModal = document.getElementById('userModal');
    const userForm = document.getElementById('userForm');
    const userSearch = document.getElementById('userSearch');
    const userRoleFilter = document.getElementById('userRoleFilter');
    const usersList = document.getElementById('usersList');

    // Event Listeners
    addUserBtn.addEventListener('click', () => openUserModal());
    userForm.addEventListener('submit', handleUserSubmit);
    userSearch.addEventListener('input', filterUsers);
    userRoleFilter.addEventListener('change', filterUsers);

    // Load initial user data
    loadUsers();

    // Functions
    async function loadUsers() {
        try {
            const response = await fetch('/api/users');
            const users = await response.json();
            renderUsers(users);
        } catch (error) {
            console.error('Error loading users:', error);
            showNotification('Error loading users', 'error');
        }
    }

    function renderUsers(users) {
        usersList.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td><span class="badge ${user.role}">${user.role}</span></td>
                <td><span class="badge ${user.status}">${user.status}</span></td>
                <td>${formatDate(user.lastLogin)}</td>
                <td class="actions">
                    <button class="btn btn-small btn-secondary" onclick="editUser('${user.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteUser('${user.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            usersList.appendChild(row);
        });
    }

    function openUserModal(userId = null) {
        const modalTitle = document.getElementById('modalTitle');
        modalTitle.textContent = userId ? 'Edit User' : 'Add New User';
        
        if (userId) {
            // Load user data for editing
            loadUserData(userId);
        } else {
            // Reset form for new user
            userForm.reset();
        }
        
        userModal.classList.add('active');
    }

    async function loadUserData(userId) {
        try {
            const response = await fetch(`/api/users/${userId}`);
            const user = await response.json();
            
            // Populate form fields
            document.getElementById('username').value = user.username;
            document.getElementById('email').value = user.email;
            document.getElementById('userRole').value = user.role;
            document.getElementById('userStatus').value = user.status;
            
            // Clear password field for editing
            document.getElementById('password').value = '';
        } catch (error) {
            console.error('Error loading user data:', error);
            showNotification('Error loading user data', 'error');
        }
    }

    async function handleUserSubmit(event) {
        event.preventDefault();
        
        const formData = {
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            role: document.getElementById('userRole').value,
            status: document.getElementById('userStatus').value
        };

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                closeUserModal();
                loadUsers();
                showNotification('User saved successfully', 'success');
            } else {
                throw new Error('Failed to save user');
            }
        } catch (error) {
            console.error('Error saving user:', error);
            showNotification('Error saving user', 'error');
        }
    }

    function closeUserModal() {
        userModal.classList.remove('active');
        userForm.reset();
    }

    async function deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                const response = await fetch(`/api/users/${userId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    loadUsers();
                    showNotification('User deleted successfully', 'success');
                } else {
                    throw new Error('Failed to delete user');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                showNotification('Error deleting user', 'error');
            }
        }
    }

    function filterUsers() {
        const searchTerm = userSearch.value.toLowerCase();
        const roleFilter = userRoleFilter.value;
        
        const rows = usersList.getElementsByTagName('tr');
        
        Array.from(rows).forEach(row => {
            const username = row.cells[0].textContent.toLowerCase();
            const email = row.cells[1].textContent.toLowerCase();
            const role = row.cells[2].textContent.toLowerCase();
            
            const matchesSearch = username.includes(searchTerm) || 
                                email.includes(searchTerm);
            const matchesRole = roleFilter === 'all' || role === roleFilter;
            
            row.style.display = matchesSearch && matchesRole ? '' : 'none';
        });
    }

    // Helper Functions
    function formatDate(date) {
        return new Date(date).toLocaleString();
    }

    function showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Add to document
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Make functions available globally
    window.editUser = openUserModal;
    window.deleteUser = deleteUser;
    window.closeUserModal = closeUserModal;
});
