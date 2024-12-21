document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatWidget = document.getElementById('chatWidget');
    const chatWindow = document.getElementById('chatWindow');
    const chatButton = document.getElementById('chatWidgetButton');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.querySelector('.send-btn');
    const chatMessages = document.querySelector('.chat-messages');
    const fileInput = document.getElementById('fileInput');
    const filePreview = document.querySelector('.file-preview');
    const previewImage = document.querySelector('.preview-image');
    const fileName = document.querySelector('.file-name');
    const fileSize = document.querySelector('.file-size');
    const removeFileButton = document.querySelector('.remove-file');
    const typingIndicator = document.querySelector('.typing-indicator');
    const notificationBadge = document.querySelector('.notification-badge');
    const quickActionBtns = document.querySelectorAll('.quick-action-btn');
    
    let unreadMessages = 0;
    let isTyping = false;
    let typingTimeout;
    let selectedFile = null;

    // Chatbot responses
    const botResponses = {
        'games': 'You can play various casino games on our platform. Visit https://m9shankoemee.com/ to start playing!',
        'deposit': 'To make a deposit, please contact our customer service for assistance.',
        'withdraw': 'For withdrawals, please reach out to our support team and they will guide you through the process.',
        'vip': 'Our VIP program offers exclusive benefits and bonuses. Would you like to learn more?',
        'default': 'Thank you for contacting us. How can we assist you today?'
    };

    // Toggle chat window
    chatButton.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
        if (!chatWindow.classList.contains('hidden')) {
            messageInput.focus();
            resetUnreadMessages();
        }
    });

    // Quick action buttons
    quickActionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const query = btn.getAttribute('data-query');
            appendMessage({
                content: botResponses[query] || botResponses.default,
                sender: 'bot',
                timestamp: new Date().toISOString()
            });
        });
    });

    // Handle file upload
    fileInput.addEventListener('change', handleFileSelect);
    removeFileButton.addEventListener('click', clearFilePreview);

    // Handle message input
    messageInput.addEventListener('input', () => {
        updateSendButton();
        handleTyping();
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Send message
    sendButton.addEventListener('click', sendMessage);

    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text && !selectedFile) return;

        // Append user message
        appendMessage({
            content: text,
            sender: 'user',
            timestamp: new Date().toISOString(),
            file: selectedFile
        });

        // Simulate bot typing
        showTypingIndicator();

        // Simulate bot response after a delay
        setTimeout(() => {
            hideTypingIndicator();
            appendMessage({
                content: getBotResponse(text),
                sender: 'bot',
                timestamp: new Date().toISOString()
            });
        }, 1000);

        // Clear input
        messageInput.value = '';
        clearFilePreview();
        updateSendButton();
    }

    function appendMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        // Add text content
        if (message.content) {
            contentDiv.innerHTML = message.content.replace(/\n/g, '<br>');
        }

        // Add file if present
        if (message.file) {
            if (message.file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(message.file);
                img.alt = message.file.name;
                img.style.maxWidth = '200px';
                contentDiv.appendChild(img);
            } else {
                const fileLink = document.createElement('div');
                fileLink.className = 'file-attachment';
                fileLink.innerHTML = `📎 ${message.file.name} (${formatFileSize(message.file.size)})`;
                contentDiv.appendChild(fileLink);
            }
        }

        messageDiv.appendChild(contentDiv);

        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'message-time';
        timestamp.textContent = new Date(message.timestamp).toLocaleTimeString();
        messageDiv.appendChild(timestamp);

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Increment unread messages if chat window is hidden
        if (chatWindow.classList.contains('hidden')) {
            incrementUnreadMessages();
        }
    }

    function getBotResponse(text) {
        text = text.toLowerCase();
        
        if (text.includes('game') || text.includes('play')) {
            return botResponses.games;
        } else if (text.includes('deposit') || text.includes('payment')) {
            return botResponses.deposit;
        } else if (text.includes('withdraw') || text.includes('cash out')) {
            return botResponses.withdraw;
        } else if (text.includes('vip') || text.includes('premium')) {
            return botResponses.vip;
        }
        
        return 'How can I assist you further? Feel free to ask about our games, deposits, withdrawals, or VIP benefits.';
    }

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        selectedFile = file;
        filePreview.classList.remove('hidden');
        
        if (file.type.startsWith('image/')) {
            previewImage.src = URL.createObjectURL(file);
            previewImage.classList.remove('hidden');
        } else {
            previewImage.classList.add('hidden');
        }

        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
    }

    function clearFilePreview() {
        selectedFile = null;
        filePreview.classList.add('hidden');
        previewImage.src = '';
        fileName.textContent = '';
        fileSize.textContent = '';
        fileInput.value = '';
    }

    function handleTyping() {
        if (!isTyping) {
            isTyping = true;
            showTypingIndicator();
        }

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            isTyping = false;
            hideTypingIndicator();
        }, 1000);
    }

    function showTypingIndicator() {
        typingIndicator.classList.remove('hidden');
    }

    function hideTypingIndicator() {
        typingIndicator.classList.add('hidden');
    }

    function incrementUnreadMessages() {
        unreadMessages++;
        notificationBadge.textContent = unreadMessages;
        notificationBadge.classList.remove('hidden');
    }

    function resetUnreadMessages() {
        unreadMessages = 0;
        notificationBadge.textContent = '0';
        notificationBadge.classList.add('hidden');
    }

    function updateSendButton() {
        const text = messageInput.value.trim();
        sendButton.disabled = !text && !selectedFile;
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});
