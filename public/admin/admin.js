document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatList = document.querySelector('.chat-list');
    const chatWindow = document.querySelector('.chat-window');
    const chatMessages = document.querySelector('.chat-messages');
    const messageInput = chatWindow.querySelector('input');
    const sendButton = chatWindow.querySelector('.send-btn');
    const closeChatButton = chatWindow.querySelector('.close-chat');
    const refreshButton = document.querySelector('.refresh-btn');
    const searchInput = document.querySelector('.search-box input');
    const logoutButton = document.querySelector('.logout-btn');

    // Chat data storage
    let activeChats = [];
    let currentChat = null;

    // Mock data for testing
    const mockChats = [
        {
            id: 1,
            username: 'John Doe',
            lastMessage: 'I need help with the game.',
            timestamp: new Date().toISOString(),
            unread: 2,
            status: 'online'
        },
        {
            id: 2,
            username: 'Jane Smith',
            lastMessage: 'How do I make a deposit?',
            timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
            unread: 0,
            status: 'online'
        },
        {
            id: 3,
            username: 'Mike Johnson',
            lastMessage: 'Thanks for your help!',
            timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
            unread: 1,
            status: 'offline'
        }
    ];

    // Initialize the dashboard
    function init() {
        loadActiveChats();
        setupEventListeners();
        updateStats();
        loadContentData();
        setupContentManager();
    }

    // Load active chats
    function loadActiveChats() {
        activeChats = mockChats;
        renderChatList();
    }

    // Render chat list
    function renderChatList() {
        chatList.innerHTML = '';
        activeChats.forEach(chat => {
            const chatItem = createChatListItem(chat);
            chatList.appendChild(chatItem);
        });
    }

    // Create chat list item
    function createChatListItem(chat) {
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.innerHTML = `
            <div class="chat-item-content">
                <div class="chat-item-avatar">
                    <img src="../assets/user-avatar.png" alt="${chat.username}">
                    <span class="status-dot ${chat.status}"></span>
                </div>
                <div class="chat-item-details">
                    <div class="chat-item-header">
                        <span class="username">${chat.username}</span>
                        <span class="time">${formatTime(new Date(chat.timestamp))}</span>
                    </div>
                    <div class="chat-item-message">
                        <p>${chat.lastMessage}</p>
                        ${chat.unread ? `<span class="unread-count">${chat.unread}</span>` : ''}
                    </div>
                </div>
            </div>
        `;

        div.addEventListener('click', () => openChat(chat));
        return div;
    }

    // Open chat window
    function openChat(chat) {
        currentChat = chat;
        chatWindow.classList.remove('hidden');
        
        // Update chat window header
        const userInfo = chatWindow.querySelector('.user-info');
        userInfo.querySelector('.user-name').textContent = chat.username;
        userInfo.querySelector('.user-status').textContent = chat.status;

        // Load chat messages
        loadChatMessages(chat.id);
    }

    // Load chat messages
    function loadChatMessages(chatId) {
        // Mock messages
        const messages = [
            {
                id: 1,
                sender: 'user',
                content: 'Hello, I need help with the game.',
                timestamp: new Date(Date.now() - 30 * 60000).toISOString()
            },
            {
                id: 2,
                sender: 'admin',
                content: 'Hi! I\'d be happy to help. What specific issue are you experiencing?',
                timestamp: new Date(Date.now() - 29 * 60000).toISOString()
            },
            {
                id: 3,
                sender: 'user',
                content: 'I can\'t access the casino games.',
                timestamp: new Date(Date.now() - 28 * 60000).toISOString()
            }
        ];

        renderMessages(messages);
    }

    // Render messages
    function renderMessages(messages) {
        chatMessages.innerHTML = '';
        messages.forEach(message => {
            const messageDiv = createMessageElement(message);
            chatMessages.appendChild(messageDiv);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Create message element
    function createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `message ${message.sender}`;
        div.innerHTML = `
            <div class="message-content">${message.content}</div>
            <div class="message-time">${formatTime(new Date(message.timestamp))}</div>
        `;
        return div;
    }

    // Setup event listeners
    function setupEventListeners() {
        // Send message
        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Close chat window
        closeChatButton.addEventListener('click', () => {
            chatWindow.classList.add('hidden');
            currentChat = null;
        });

        // Refresh chat list
        refreshButton.addEventListener('click', () => {
            loadActiveChats();
            updateStats();
        });

        // Search functionality
        searchInput.addEventListener('input', e => {
            const query = e.target.value.toLowerCase();
            const filteredChats = activeChats.filter(chat => 
                chat.username.toLowerCase().includes(query) || 
                chat.lastMessage.toLowerCase().includes(query)
            );
            renderFilteredChats(filteredChats);
        });

        // Logout
        logoutButton.addEventListener('click', () => {
            // Implement logout functionality
            window.location.href = '/login.html';
        });
    }

    // Send message
    function sendMessage() {
        const content = messageInput.value.trim();
        if (!content || !currentChat) return;

        const message = {
            id: Date.now(),
            sender: 'admin',
            content: content,
            timestamp: new Date().toISOString()
        };

        // Add message to chat
        const messageDiv = createMessageElement(message);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Clear input
        messageInput.value = '';

        // Update chat list
        currentChat.lastMessage = content;
        currentChat.timestamp = message.timestamp;
        renderChatList();
    }

    // Render filtered chats
    function renderFilteredChats(filteredChats) {
        chatList.innerHTML = '';
        filteredChats.forEach(chat => {
            const chatItem = createChatListItem(chat);
            chatList.appendChild(chatItem);
        });
    }

    // Update dashboard stats
    function updateStats() {
        const stats = {
            totalUsers: 1234,
            activeChats: activeChats.length,
            responseTime: '2m 30s',
            satisfaction: '94%'
        };

        document.querySelector('.stat-card:nth-child(1) .stat-number').textContent = stats.totalUsers;
        document.querySelector('.stat-card:nth-child(2) .stat-number').textContent = stats.activeChats;
        document.querySelector('.stat-card:nth-child(3) .stat-number').textContent = stats.responseTime;
        document.querySelector('.stat-card:nth-child(4) .stat-number').textContent = stats.satisfaction;
    }

    // Helper function to format time
    function formatTime(date) {
        return new Intl.DateTimeFormat('en', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        }).format(date);
    }

    // Content Manager Functions
    function setupContentManager() {
        const navLinks = document.querySelectorAll('.nav-links a');
        const contentSections = document.querySelectorAll('.content-section');
        const addPromotionBtn = document.querySelector('.add-promotion-btn');
        const addResponseBtn = document.querySelector('.add-response-btn');
        const saveContentBtn = document.querySelector('.save-content-btn');
        const previewBtn = document.querySelector('.preview-btn');

        // Navigation
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.target.closest('a').getAttribute('href').substring(1);
                showSection(target);
            });
        });

        // Add promotion
        addPromotionBtn.addEventListener('click', addPromotion);

        // Add quick response
        addResponseBtn.addEventListener('click', addQuickResponse);

        // Save content
        saveContentBtn.addEventListener('click', saveContent);

        // Preview changes
        previewBtn.addEventListener('click', previewChanges);
    }

    function showSection(sectionId) {
        const sections = document.querySelectorAll('.content-section');
        const navItems = document.querySelectorAll('.nav-links li');

        sections.forEach(section => {
            section.classList.add('hidden');
        });

        navItems.forEach(item => {
            item.classList.remove('active');
        });

        if (sectionId === 'dashboard') {
            document.getElementById('dashboard-main').classList.remove('hidden');
            document.querySelector('a[href="#dashboard"]').parentElement.classList.add('active');
        } else if (sectionId === 'content') {
            document.getElementById('content-manager').classList.remove('hidden');
            document.querySelector('a[href="#content"]').parentElement.classList.add('active');
        }
    }

    function loadContentData() {
        // Load existing data from localStorage or use defaults
        const savedContent = localStorage.getItem('siteContent');
        const content = savedContent ? JSON.parse(savedContent) : {
            promotions: [
                {
                    title: 'Welcome Bonus',
                    description: '300% up to $3000 on your first deposit',
                    buttonText: 'Claim Now'
                },
                {
                    title: 'Daily Cashback',
                    description: 'Get 15% cashback on your daily losses',
                    buttonText: 'Learn More'
                }
            ],
            quickResponses: [
                'How can I help you today?',
                'Please visit https://m9shankoemee.com/ to start playing!',
                'Our support team is available 24/7 to assist you.'
            ],
            chatbotResponses: {
                games: 'You can play various casino games on our platform. Visit https://m9shankoemee.com/ to start playing!',
                deposit: 'To make a deposit, please contact our customer service for assistance.',
                withdrawal: 'For withdrawals, please reach out to our support team and they will guide you through the process.',
                vip: 'Our VIP program offers exclusive benefits and bonuses. Would you like to learn more?',
                custom: []
            }
        };

        // Load promotions
        renderPromotions(content.promotions);
        
        // Load quick responses
        renderQuickResponses(content.quickResponses);

        // Load chatbot responses
        loadChatbotResponses(content.chatbotResponses);

        // Setup custom response functionality
        setupCustomResponses();
    }

    function loadChatbotResponses(responses) {
        // Set predefined responses
        document.getElementById('gameLinkResponse').value = responses.games;
        document.getElementById('depositResponse').value = responses.deposit;
        document.getElementById('withdrawalResponse').value = responses.withdrawal;
        document.getElementById('vipResponse').value = responses.vip;

        // Load custom responses
        renderCustomResponses(responses.custom || []);
    }

    function setupCustomResponses() {
        const addCustomResponseBtn = document.querySelector('.add-custom-response-btn');
        addCustomResponseBtn.addEventListener('click', addCustomResponse);
    }

    function addCustomResponse() {
        const customResponse = {
            trigger: 'Enter trigger words (comma-separated)',
            response: 'Enter response message'
        };

        const responseItem = createCustomResponseItem(customResponse);
        document.getElementById('custom-responses-list').appendChild(responseItem);
    }

    function createCustomResponseItem(response) {
        const div = document.createElement('div');
        div.className = 'custom-response-item';
        div.innerHTML = `
            <button class="remove-btn"><i class="fas fa-times"></i></button>
            <div class="form-group">
                <label>Trigger Words (comma-separated)</label>
                <input type="text" class="form-input" value="${response.trigger}" data-field="trigger">
            </div>
            <div class="form-group">
                <label>Response Message</label>
                <textarea class="form-input" rows="2" data-field="response">${response.response}</textarea>
            </div>
            <div class="response-preview">
                Preview: When user types any of these words: <strong>${response.trigger}</strong>
                <br>Bot will respond: ${response.response}
            </div>
        `;

        // Update preview on input change
        const inputs = div.querySelectorAll('.form-input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                updateCustomResponsePreview(div);
            });
        });

        // Remove button functionality
        div.querySelector('.remove-btn').addEventListener('click', () => {
            div.remove();
        });

        return div;
    }

    function updateCustomResponsePreview(responseItem) {
        const trigger = responseItem.querySelector('[data-field="trigger"]').value;
        const response = responseItem.querySelector('[data-field="response"]').value;
        const preview = responseItem.querySelector('.response-preview');
        
        preview.innerHTML = `
            Preview: When user types any of these words: <strong>${trigger}</strong>
            <br>Bot will respond: ${response}
        `;
    }

    function renderCustomResponses(responses) {
        const customResponsesList = document.getElementById('custom-responses-list');
        customResponsesList.innerHTML = '';
        
        responses.forEach(response => {
            const responseItem = createCustomResponseItem(response);
            customResponsesList.appendChild(responseItem);
        });
    }

    function saveContent() {
        const contentData = {
            gameButtonUrl: document.getElementById('gameButtonUrl').value,
            ageRestriction: document.getElementById('ageRestriction').value,
            supportMessage: document.getElementById('supportMessage').value,
            welcomeMessage: document.getElementById('welcomeMessage').value,
            promotions: getPromotionsData(),
            quickResponses: getQuickResponsesData(),
            chatbotResponses: getChatbotResponsesData()
        };

        // Save to localStorage
        localStorage.setItem('siteContent', JSON.stringify(contentData));

        // Update the main page
        updateMainPage(contentData);

        // Update chat.js with new responses
        updateChatbotResponses(contentData.chatbotResponses);

        // Show success message
        alert('Content updated successfully!');
    }

    function getChatbotResponsesData() {
        const customResponses = [];
        document.querySelectorAll('.custom-response-item').forEach(item => {
            customResponses.push({
                trigger: item.querySelector('[data-field="trigger"]').value,
                response: item.querySelector('[data-field="response"]').value
            });
        });

        return {
            games: document.getElementById('gameLinkResponse').value,
            deposit: document.getElementById('depositResponse').value,
            withdrawal: document.getElementById('withdrawalResponse').value,
            vip: document.getElementById('vipResponse').value,
            custom: customResponses
        };
    }

    function updateChatbotResponses(responses) {
        // Update the chat.js file's response logic
        const chatSettings = {
            welcomeMessage: document.getElementById('welcomeMessage').value,
            responses: responses,
            quickResponses: getQuickResponsesData()
        };

        localStorage.setItem('chatSettings', JSON.stringify(chatSettings));
    }

    function renderPromotions(promotions) {
        const promotionsList = document.getElementById('promotions-list');
        promotionsList.innerHTML = '';

        promotions.forEach((promo, index) => {
            const promoItem = createPromotionItem(promo, index);
            promotionsList.appendChild(promoItem);
        });
    }

    function createPromotionItem(promo, index) {
        const div = document.createElement('div');
        div.className = 'promotion-item';
        div.innerHTML = `
            <button class="remove-btn" data-index="${index}"><i class="fas fa-times"></i></button>
            <div class="form-group">
                <label>Title</label>
                <input type="text" class="form-input" value="${promo.title}" data-field="title">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea class="form-input" rows="2" data-field="description">${promo.description}</textarea>
            </div>
            <div class="form-group">
                <label>Button Text</label>
                <input type="text" class="form-input" value="${promo.buttonText}" data-field="buttonText">
            </div>
        `;

        div.querySelector('.remove-btn').addEventListener('click', () => {
            div.remove();
        });

        return div;
    }

    function renderQuickResponses(responses) {
        const responsesList = document.getElementById('quick-responses-list');
        responsesList.innerHTML = '';

        responses.forEach((response, index) => {
            const responseItem = createQuickResponseItem(response, index);
            responsesList.appendChild(responseItem);
        });
    }

    function createQuickResponseItem(response, index) {
        const div = document.createElement('div');
        div.className = 'response-item';
        div.innerHTML = `
            <button class="remove-btn" data-index="${index}"><i class="fas fa-times"></i></button>
            <div class="form-group">
                <label>Response Text</label>
                <textarea class="form-input" rows="2">${response}</textarea>
            </div>
        `;

        div.querySelector('.remove-btn').addEventListener('click', () => {
            div.remove();
        });

        return div;
    }

    function addPromotion() {
        const newPromo = {
            title: 'New Promotion',
            description: 'Enter promotion description',
            buttonText: 'Click Here'
        };

        const promoItem = createPromotionItem(newPromo, document.querySelectorAll('.promotion-item').length);
        document.getElementById('promotions-list').appendChild(promoItem);
    }

    function addQuickResponse() {
        const newResponse = 'Enter quick response text';
        const responseItem = createQuickResponseItem(newResponse, document.querySelectorAll('.response-item').length);
        document.getElementById('quick-responses-list').appendChild(responseItem);
    }

    function getPromotionsData() {
        const promotions = [];
        document.querySelectorAll('.promotion-item').forEach(item => {
            promotions.push({
                title: item.querySelector('[data-field="title"]').value,
                description: item.querySelector('[data-field="description"]').value,
                buttonText: item.querySelector('[data-field="buttonText"]').value
            });
        });
        return promotions;
    }

    function getQuickResponsesData() {
        const responses = [];
        document.querySelectorAll('.response-item textarea').forEach(textarea => {
            responses.push(textarea.value);
        });
        return responses;
    }

    function updateMainPage(contentData) {
        // Update game button URL
        const gameBtn = document.querySelector('a[href*="m9shankoemee.com"]');
        if (gameBtn) {
            gameBtn.href = contentData.gameButtonUrl;
        }

        // Update promotions
        const promotionsContainer = document.querySelector('.promotions-container');
        if (promotionsContainer) {
            promotionsContainer.innerHTML = contentData.promotions.map(promo => `
                <div class="promotion-card">
                    <h3>${promo.title}</h3>
                    <p>${promo.description}</p>
                    <button class="promo-btn">${promo.buttonText}</button>
                </div>
            `).join('');
        }

        // Update responsible gaming section
        const responsibleGaming = document.querySelector('.responsible-gaming');
        if (responsibleGaming) {
            const ageNotice = responsibleGaming.querySelector('.age-notice');
            const supportMsg = responsibleGaming.querySelector('.support-message');
            if (ageNotice) ageNotice.textContent = contentData.ageRestriction;
            if (supportMsg) supportMsg.textContent = contentData.supportMessage;
        }

        // Update chat welcome message and quick responses
        localStorage.setItem('chatSettings', JSON.stringify({
            welcomeMessage: contentData.welcomeMessage,
            quickResponses: contentData.quickResponses
        }));
    }

    function previewChanges() {
        const contentData = {
            gameButtonUrl: document.getElementById('gameButtonUrl').value,
            ageRestriction: document.getElementById('ageRestriction').value,
            supportMessage: document.getElementById('supportMessage').value,
            welcomeMessage: document.getElementById('welcomeMessage').value,
            promotions: getPromotionsData(),
            quickResponses: getQuickResponsesData(),
            chatbotResponses: getChatbotResponsesData()
        };

        // Open preview in new window
        const previewWindow = window.open('', '_blank');
        previewWindow.document.write(`
            <html>
                <head>
                    <title>Content Preview</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .preview-section { margin-bottom: 30px; }
                        h2 { color: #ffd700; }
                    </style>
                </head>
                <body>
                    <div class="preview-section">
                        <h2>Game Button</h2>
                        <p>URL: ${contentData.gameButtonUrl}</p>
                    </div>
                    <div class="preview-section">
                        <h2>Promotions</h2>
                        ${contentData.promotions.map(promo => `
                            <div style="margin-bottom: 15px;">
                                <h3>${promo.title}</h3>
                                <p>${promo.description}</p>
                                <button>${promo.buttonText}</button>
                            </div>
                        `).join('')}
                    </div>
                    <div class="preview-section">
                        <h2>Responsible Gaming</h2>
                        <p>Age Restriction: ${contentData.ageRestriction}</p>
                        <p>Support Message: ${contentData.supportMessage}</p>
                    </div>
                    <div class="preview-section">
                        <h2>Chat Settings</h2>
                        <p>Welcome Message: ${contentData.welcomeMessage}</p>
                        <h3>Quick Responses:</h3>
                        <ul>
                            ${contentData.quickResponses.map(response => `
                                <li>${response}</li>
                            `).join('')}
                        </ul>
                    </div>
                </body>
            </html>
        `);
    }

    // Initialize the dashboard
    init();
});
