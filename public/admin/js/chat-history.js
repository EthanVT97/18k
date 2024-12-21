// Chat History Management JavaScript

class ChatHistoryManager {
    constructor() {
        this.chats = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.setupEventListeners();
        this.loadChatHistory();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Export button
        const exportBtn = document.querySelector('.export-chats');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportChatHistory());
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

        // Chat item actions
        document.querySelectorAll('.chat-actions button').forEach(button => {
            button.addEventListener('click', (e) => {
                const chatItem = e.currentTarget.closest('.chat-item');
                const chatId = chatItem.querySelector('.chat-id').textContent;

                if (e.currentTarget.classList.contains('view-chat')) {
                    this.viewChat(chatId);
                } else if (e.currentTarget.classList.contains('download-chat')) {
                    this.downloadChat(chatId);
                } else if (e.currentTarget.classList.contains('delete-chat')) {
                    this.deleteChat(chatId);
                }
            });
        });
    }

    loadChatHistory() {
        // Simulated chat history data - replace with actual API call
        this.chats = [
            {
                id: 'CH12345',
                user: {
                    name: 'John Doe',
                    avatar: 'https://via.placeholder.com/40'
                },
                status: 'closed',
                timestamp: '2024-12-21 15:30',
                lastMessage: 'Thank you for your help with my account issue...',
                agent: 'Agent 1',
                duration: '30 minutes',
                messages: [
                    {
                        sender: 'John Doe',
                        type: 'user',
                        message: 'Hello, I need help with my account.',
                        time: '15:00'
                    },
                    {
                        sender: 'Agent 1',
                        type: 'agent',
                        message: 'Hi John, I\'d be happy to help. Could you please provide your account number?',
                        time: '15:01'
                    }
                    // Add more messages...
                ]
            }
            // Add more chat history...
        ];

        this.renderChatHistory();
    }

    renderChatHistory() {
        const chatList = document.querySelector('.chat-list');
        if (!chatList) return;

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginatedChats = this.chats.slice(start, end);

        chatList.innerHTML = paginatedChats.map(chat => `
            <div class="chat-item">
                <div class="chat-header">
                    <div class="user-info">
                        <img src="${chat.user.avatar}" alt="${chat.user.name}">
                        <div class="user-details">
                            <h4>${chat.user.name}</h4>
                            <span class="chat-id">${chat.id}</span>
                        </div>
                    </div>
                    <div class="chat-status">
                        <span class="status-badge ${chat.status}">${chat.status}</span>
                        <span class="chat-time">${chat.timestamp}</span>
                    </div>
                </div>
                <div class="chat-preview">
                    <p>Last message: ${chat.lastMessage}</p>
                </div>
                <div class="chat-actions">
                    <button class="view-chat">View Full Chat</button>
                    <button class="download-chat"><i class="fas fa-download"></i></button>
                    <button class="delete-chat"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');

        this.updatePagination();
    }

    updatePagination() {
        const totalPages = Math.ceil(this.chats.length / this.itemsPerPage);
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
        const totalPages = Math.ceil(this.chats.length / this.itemsPerPage);
        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.renderChatHistory();
        }
    }

    handleSearch(query) {
        if (!query) {
            this.loadChatHistory();
            return;
        }

        const searchQuery = query.toLowerCase();
        this.chats = this.chats.filter(chat => 
            chat.user.name.toLowerCase().includes(searchQuery) ||
            chat.id.toLowerCase().includes(searchQuery) ||
            chat.lastMessage.toLowerCase().includes(searchQuery)
        );

        this.currentPage = 1;
        this.renderChatHistory();
    }

    applyFilters() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const status = document.getElementById('chatStatus').value;
        const agent = document.getElementById('agentFilter').value;

        this.chats = this.chats.filter(chat => {
            let matchStatus = status === 'all' || chat.status === status;
            let matchAgent = agent === 'all' || chat.agent === agent;
            let matchDate = true;

            if (startDate && endDate) {
                const chatDate = new Date(chat.timestamp);
                const start = new Date(startDate);
                const end = new Date(endDate);
                matchDate = chatDate >= start && chatDate <= end;
            }

            return matchStatus && matchAgent && matchDate;
        });

        this.currentPage = 1;
        this.renderChatHistory();
    }

    viewChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;

        const modal = document.querySelector('.chat-details-modal');
        if (!modal) return;

        // Update modal content with chat details
        modal.querySelector('.chat-info .info-group:nth-child(1) span').textContent = chat.id;
        modal.querySelector('.chat-info .info-group:nth-child(2) span').textContent = chat.timestamp;
        modal.querySelector('.chat-info .info-group:nth-child(3) span').textContent = chat.duration;
        modal.querySelector('.chat-info .info-group:nth-child(4) span').textContent = chat.agent;

        // Render chat messages
        const messagesContainer = modal.querySelector('.chat-messages');
        messagesContainer.innerHTML = chat.messages.map(message => `
            <div class="message ${message.type}">
                <img src="https://via.placeholder.com/40" alt="${message.sender}">
                <div class="message-content">
                    <div class="message-header">
                        <span class="sender">${message.sender}</span>
                        <span class="time">${message.time}</span>
                    </div>
                    <p>${message.message}</p>
                </div>
            </div>
        `).join('');

        // Show modal
        modal.style.display = 'block';
    }

    downloadChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;

        // Create chat transcript
        const transcript = chat.messages.map(message => 
            `[${message.time}] ${message.sender}: ${message.message}`
        ).join('\n');

        // Create and download file
        const blob = new Blob([transcript], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-transcript-${chatId}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    deleteChat(chatId) {
        if (confirm('Are you sure you want to delete this chat history?')) {
            this.chats = this.chats.filter(c => c.id !== chatId);
            this.renderChatHistory();
        }
    }

    exportChatHistory() {
        const exportData = this.chats.map(chat => ({
            chatId: chat.id,
            userName: chat.user.name,
            status: chat.status,
            timestamp: chat.timestamp,
            agent: chat.agent,
            duration: chat.duration,
            messageCount: chat.messages.length
        }));

        const csv = [
            ['Chat ID', 'User Name', 'Status', 'Timestamp', 'Agent', 'Duration', 'Message Count'],
            ...exportData.map(row => Object.values(row))
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chat-history-export.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
}

// Initialize Chat History Manager
const chatHistoryManager = new ChatHistoryManager();

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
