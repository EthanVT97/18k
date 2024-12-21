document.addEventListener('DOMContentLoaded', function() {
    // Initialize chat functionality
    initializeChat();
    
    // Update stats periodically
    updateChatStats();
    setInterval(updateChatStats, 30000); // Update every 30 seconds
});

function initializeChat() {
    const chatStatus = document.getElementById('chatStatus');
    const activeChats = document.getElementById('activeChats');
    const chatMessages = document.getElementById('chatMessages');
    const chatTemplate = document.getElementById('chatItemTemplate');

    // Chat status filter
    chatStatus.addEventListener('change', function() {
        loadChats(this.value);
    });

    // Initial chat load
    loadChats('all');

    // Handle chat selection
    activeChats.addEventListener('click', function(e) {
        const chatItem = e.target.closest('.chat-item');
        if (chatItem) {
            selectChat(chatItem.dataset.chatId);
        }
    });

    // Handle message sending
    const messageInput = document.querySelector('.chat-input textarea');
    const sendButton = document.querySelector('.chat-input .btn-primary');

    sendButton.addEventListener('click', function() {
        sendMessage(messageInput.value);
        messageInput.value = '';
    });

    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendButton.click();
        }
    });
}

function loadChats(status) {
    // Simulated chat data - replace with actual API call
    const chats = [
        {
            id: 1,
            user: 'John Doe',
            avatar: 'images/user1.jpg',
            lastMessage: 'Hello, I need help with...',
            time: '2 min ago',
            status: 'active',
            messageCount: 3,
            duration: '5m'
        },
        // Add more chat data as needed
    ];

    const activeChats = document.getElementById('activeChats');
    const template = document.getElementById('chatItemTemplate');
    
    activeChats.innerHTML = '';
    
    chats.forEach(chat => {
        if (status === 'all' || chat.status === status) {
            const chatElement = template.content.cloneNode(true);
            
            chatElement.querySelector('.chat-avatar').src = chat.avatar;
            chatElement.querySelector('.chat-user').textContent = chat.user;
            chatElement.querySelector('.chat-time').textContent = chat.time;
            chatElement.querySelector('.chat-status').textContent = chat.status;
            chatElement.querySelector('.chat-preview').textContent = chat.lastMessage;
            chatElement.querySelector('.chat-messages-count').textContent = `${chat.messageCount} messages`;
            chatElement.querySelector('.chat-duration').textContent = chat.duration;
            
            const chatItem = chatElement.querySelector('.chat-item');
            chatItem.dataset.chatId = chat.id;
            
            activeChats.appendChild(chatElement);
        }
    });
}

function selectChat(chatId) {
    // Highlight selected chat
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('selected');
    });
    document.querySelector(`[data-chat-id="${chatId}"]`).classList.add('selected');

    // Load chat messages
    loadChatMessages(chatId);
}

function loadChatMessages(chatId) {
    // Simulated message data - replace with actual API call
    const messages = [
        {
            sender: 'user',
            content: 'Hello, I need help with my account',
            time: '14:30'
        },
        {
            sender: 'admin',
            content: 'Hi! I\'d be happy to help. What seems to be the issue?',
            time: '14:31'
        }
        // Add more messages as needed
    ];

    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';

    messages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.sender}`;
        messageElement.innerHTML = `
            <div class="message-content">
                <p>${message.content}</p>
                <span class="message-time">${message.time}</span>
            </div>
        `;
        chatMessages.appendChild(messageElement);
    });

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage(content) {
    if (!content.trim()) return;

    // Simulated message sending - replace with actual API call
    const message = {
        sender: 'admin',
        content: content,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.sender}`;
    messageElement.innerHTML = `
        <div class="message-content">
            <p>${message.content}</p>
            <span class="message-time">${message.time}</span>
        </div>
    `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateChatStats() {
    // Simulated stats update - replace with actual API call
    const stats = {
        liveChats: Math.floor(Math.random() * 20) + 1,
        responseTime: Math.floor(Math.random() * 60) + 'sec',
        totalUsers: Math.floor(Math.random() * 1000),
        totalMessages: Math.floor(Math.random() * 5000)
    };

    document.getElementById('liveChats').textContent = stats.liveChats;
    document.getElementById('responseTime').textContent = stats.responseTime;
    document.getElementById('totalUsers').textContent = stats.totalUsers;
    document.getElementById('totalMessages').textContent = stats.totalMessages;

    // Update last updated time
    document.getElementById('lastUpdated').textContent = 'Just now';
}
