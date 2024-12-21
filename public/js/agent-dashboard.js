// Agent Dashboard State
let activeChats = [];
let currentChat = null;
let agentStatus = 'online';

// DOM Elements
const chatList = document.getElementById('chatList');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendMessage');
const toggleStatusButton = document.getElementById('toggleStatus');
const agentStatusElement = document.getElementById('agentStatus');
const customerInfo = document.getElementById('customerInfo');
const endChatButton = document.getElementById('endChat');
const transferChatButton = document.getElementById('transferChat');
const quickResponses = document.getElementById('quickResponses');

// WebSocket connection
let websocket = null;

// Initialize WebSocket connection
function initializeWebSocket() {
    websocket = new WebSocket('ws://localhost:8080/agent');

    websocket.onopen = () => {
        console.log('Connected to server');
        // Send agent authentication
        websocket.send(JSON.stringify({
            type: 'auth',
            role: 'agent',
            agentId: 'agent123' // Replace with actual agent ID
        }));
    };

    websocket.onclose = () => {
        console.log('Disconnected from server');
        setTimeout(initializeWebSocket, 5000); // Reconnect after 5 seconds
    };

    websocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
    };
}

// Handle incoming WebSocket messages
function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'new_chat':
            addNewChat(message.chat);
            break;
        case 'chat_message':
            handleNewMessage(message);
            break;
        case 'chat_ended':
            removeChat(message.chatId);
            break;
        case 'customer_typing':
            updateTypingIndicator(message.chatId, message.isTyping);
            break;
    }
}

// Add new chat to the list
function addNewChat(chat) {
    activeChats.push(chat);
    const chatElement = createChatListItem(chat);
    chatList.appendChild(chatElement);
    updateChatList();
}

// Create chat list item
function createChatListItem(chat) {
    const div = document.createElement('div');
    div.className = 'chat-list-item';
    div.dataset.chatId = chat.id;
    
    div.innerHTML = `
        <div class="chat-info">
            <div class="customer-name">${chat.customerName}</div>
            <div class="chat-preview">${chat.lastMessage || 'New conversation'}</div>
        </div>
        <div class="chat-meta">
            <div class="chat-time">${formatTime(chat.timestamp)}</div>
            ${chat.unread ? '<div class="unread-indicator"></div>' : ''}
        </div>
    `;

    div.addEventListener('click', () => selectChat(chat.id));
    return div;
}

// Select a chat
function selectChat(chatId) {
    currentChat = activeChats.find(chat => chat.id === chatId);
    updateChatView();
    
    // Update UI
    document.querySelectorAll('.chat-list-item').forEach(item => {
        item.classList.toggle('active', item.dataset.chatId === chatId);
    });
}

// Update chat view
function updateChatView() {
    if (!currentChat) return;

    // Update customer info
    document.getElementById('customerId').textContent = currentChat.id;
    document.getElementById('customerLanguage').textContent = currentChat.language;

    // Clear and load messages
    chatMessages.innerHTML = '';
    currentChat.messages.forEach(msg => addMessageToView(msg));
}

// Add message to chat view
function addMessageToView(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.sender}`;
    messageDiv.textContent = message.text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send message
function sendMessage() {
    if (!currentChat) return;

    const text = messageInput.value.trim();
    if (text) {
        const message = {
            type: 'chat_message',
            chatId: currentChat.id,
            text: text,
            timestamp: new Date().toISOString()
        };
        websocket.send(JSON.stringify(message));
        addMessageToView({
            sender: 'agent',
            text: text,
            timestamp: new Date().toISOString()
        });
        messageInput.value = '';
    }
}

// Toggle agent status
function toggleStatus() {
    agentStatus = agentStatus === 'online' ? 'offline' : 'online';
    agentStatusElement.textContent = agentStatus.charAt(0).toUpperCase() + agentStatus.slice(1);
    agentStatusElement.style.backgroundColor = agentStatus === 'online' ? 'var(--green-primary)' : 'var(--red-primary)';
    
    websocket.send(JSON.stringify({
        type: 'agent_status',
        status: agentStatus
    }));
}

// Format timestamp
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Event Listeners
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

toggleStatusButton.addEventListener('click', toggleStatus);

endChatButton.addEventListener('click', () => {
    if (currentChat) {
        websocket.send(JSON.stringify({
            type: 'end_chat',
            chatId: currentChat.id
        }));
    }
});

transferChatButton.addEventListener('click', () => {
    // Implement transfer chat functionality
    console.log('Transfer chat functionality to be implemented');
});

// Quick responses
quickResponses.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        messageInput.value = e.target.textContent;
        sendMessage();
    }
});

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeWebSocket();
});
