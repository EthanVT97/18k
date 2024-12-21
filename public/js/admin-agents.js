// Mock data for agents
const mockAgents = [
    {
        id: 1,
        name: 'John Doe',
        email: 'john.doe@18kchat.com',
        role: 'admin',
        status: 'active',
        lastActive: '2024-12-20T18:30:00',
        avatar: 'img/avatars/john.jpg',
        permissions: ['users', 'content', 'settings']
    },
    {
        id: 2,
        name: 'Jane Smith',
        email: 'jane.smith@18kchat.com',
        role: 'moderator',
        status: 'active',
        lastActive: '2024-12-20T19:15:00',
        avatar: 'img/avatars/jane.jpg',
        permissions: ['content']
    },
    {
        id: 3,
        name: 'Mike Johnson',
        email: 'mike.johnson@18kchat.com',
        role: 'support',
        status: 'inactive',
        lastActive: '2024-12-19T10:45:00',
        avatar: 'img/avatars/mike.jpg',
        permissions: ['users']
    }
];

// Current page and items per page
let currentPage = 1;
const itemsPerPage = 10;

// Initialize agents management
document.addEventListener('DOMContentLoaded', () => {
    initializeAgents();
    setupAgentEventListeners();
});

// Initialize agents
function initializeAgents() {
    loadAgents();
    updatePagination();
}

// Set up event listeners
function setupAgentEventListeners() {
    // Search
    document.getElementById('agentSearch').addEventListener('input', (e) => {
        filterAgents(e.target.value);
    });

    // Status filter
    document.getElementById('agentStatus').addEventListener('change', (e) => {
        filterAgents(document.getElementById('agentSearch').value, e.target.value);
    });

    // Role filter
    document.getElementById('agentRole').addEventListener('change', (e) => {
        filterAgents(document.getElementById('agentSearch').value, 
                    document.getElementById('agentStatus').value,
                    e.target.value);
    });

    // Add agent button
    document.getElementById('addAgentBtn').addEventListener('click', () => {
        showAddAgentModal();
    });

    // Add agent form submission
    document.getElementById('addAgentForm').addEventListener('submit', (e) => {
        e.preventDefault();
        addNewAgent();
    });

    // Pagination
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadAgents();
            updatePagination();
        }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(mockAgents.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            loadAgents();
            updatePagination();
        }
    });
}

// Load agents
function loadAgents() {
    const agentsList = document.getElementById('agentsList');
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedAgents = mockAgents.slice(start, end);

    agentsList.innerHTML = paginatedAgents.map(agent => `
        <div class="agent-card ${agent.status}">
            <div class="agent-header">
                <img src="${agent.avatar}" alt="${agent.name}" class="agent-avatar">
                <div class="agent-info">
                    <h4>${agent.name}</h4>
                    <span class="agent-role">${agent.role}</span>
                </div>
                <div class="agent-status">
                    <span class="status-indicator ${agent.status}"></span>
                    ${agent.status}
                </div>
            </div>
            <div class="agent-details">
                <div class="detail-item">
                    <i class="fas fa-envelope"></i>
                    <span>${agent.email}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>Last active: ${formatLastActive(agent.lastActive)}</span>
                </div>
            </div>
            <div class="agent-permissions">
                ${agent.permissions.map(perm => `
                    <span class="permission-badge">${perm}</span>
                `).join('')}
            </div>
            <div class="agent-actions">
                <button class="btn btn-secondary" onclick="editAgent(${agent.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="deleteAgent(${agent.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Filter agents
function filterAgents(search = '', status = 'all', role = 'all') {
    const filteredAgents = mockAgents.filter(agent => {
        const matchesSearch = agent.name.toLowerCase().includes(search.toLowerCase()) ||
                            agent.email.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = status === 'all' || agent.status === status;
        const matchesRole = role === 'all' || agent.role === role;
        
        return matchesSearch && matchesStatus && matchesRole;
    });

    currentPage = 1;
    updateAgentsList(filteredAgents);
    updatePagination(filteredAgents.length);
}

// Update pagination
function updatePagination(totalItems = mockAgents.length) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pageNumbers = document.getElementById('pageNumbers');
    
    let pagesHtml = '';
    for (let i = 1; i <= totalPages; i++) {
        pagesHtml += `
            <button class="page-number ${i === currentPage ? 'active' : ''}" 
                    onclick="goToPage(${i})">
                ${i}
            </button>
        `;
    }
    
    pageNumbers.innerHTML = pagesHtml;
    
    // Update button states
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

// Go to specific page
function goToPage(page) {
    currentPage = page;
    loadAgents();
    updatePagination();
}

// Show add agent modal
function showAddAgentModal() {
    const modal = document.getElementById('addAgentModal');
    modal.style.display = 'block';
}

// Add new agent
function addNewAgent() {
    const form = document.getElementById('addAgentForm');
    const newAgent = {
        id: mockAgents.length + 1,
        name: form.agentName.value,
        email: form.agentEmail.value,
        role: form.agentRole.value,
        status: 'active',
        lastActive: new Date().toISOString(),
        avatar: 'img/avatars/default.jpg',
        permissions: Array.from(form.querySelectorAll('input[type="checkbox"]:checked'))
                       .map(checkbox => checkbox.value)
    };

    mockAgents.push(newAgent);
    loadAgents();
    updatePagination();
    
    // Close modal and reset form
    document.getElementById('addAgentModal').style.display = 'none';
    form.reset();
}

// Edit agent
function editAgent(agentId) {
    const agent = mockAgents.find(a => a.id === agentId);
    if (!agent) return;

    // Implement edit functionality
    console.log('Editing agent:', agent);
}

// Delete agent
function deleteAgent(agentId) {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    const index = mockAgents.findIndex(a => a.id === agentId);
    if (index !== -1) {
        mockAgents.splice(index, 1);
        loadAgents();
        updatePagination();
    }
}

// Format last active time
function formatLastActive(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return date.toLocaleDateString();
}
