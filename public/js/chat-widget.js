// Chat Widget JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatWidgetButton = document.getElementById('chatWidgetButton');
    const chatWindow = document.getElementById('chatWindow');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.querySelector('.send-btn');
    const fileInput = document.getElementById('fileInput');
    const messagesContainer = document.querySelector('.messages-container');
    const typingIndicator = document.querySelector('.typing-indicator');
    const quickLinks = document.querySelectorAll('.quick-link');
    const minimizeBtn = document.querySelector('.minimize-btn');
    const closeBtn = document.querySelector('.close-btn');
    const filePreview = document.querySelector('.file-preview');
    const previewImage = document.querySelector('.preview-image');
    const fileName = document.querySelector('.file-name');
    const fileSize = document.querySelector('.file-size');
    const removeFileBtn = document.querySelector('.remove-file');

    // State
    let isTyping = false;
    let typingTimeout;
    let socket = null;

    // Initialize Socket.IO
    function initializeSocket() {
        socket = io('http://localhost:8080');

        socket.on('connect', () => {
            console.log('Connected to server');
            socket.emit('auth', { role: 'customer' });
        });

        socket.on('auth_success', (data) => {
            console.log('Authentication successful:', data);
        });

        socket.on('chat_message', (data) => {
            addMessage(data.message.content, 'agent');
        });

        socket.on('chat_assigned', (data) => {
            console.log('Chat assigned:', data);
            addMessage('An agent has been assigned to your chat', 'system');
        });

        socket.on('chat_ended', (data) => {
            console.log('Chat ended:', data);
            addMessage('Chat has ended', 'system');
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            addMessage('Connection lost. Trying to reconnect...', 'system');
        });
    }

    // Chat Widget Button Click Handler
    chatWidgetButton.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
        if (!chatWindow.classList.contains('hidden')) {
            chatWindow.classList.add('animate__fadeIn');
            messageInput.focus();
            if (!socket) {
                initializeSocket();
            }
        }
    });

    // Minimize and Close Button Handlers
    minimizeBtn.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
    });

    closeBtn.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
        if (socket) {
            socket.disconnect();
            socket = null;
        }
    });

    // Quick Links Handler
    quickLinks.forEach(link => {
        link.addEventListener('click', () => {
            const query = link.dataset.query;
            let message = '';
            
            switch(query) {
                case 'deposit':
                    message = "I'd like to make a deposit";
                    break;
                case 'withdraw':
                    message = "I need help with withdrawal";
                    break;
                case 'bonus':
                    message = "Can you tell me about current bonuses?";
                    break;
                case 'vip':
                    message = "I want to know about VIP benefits";
                    break;
            }
            
            messageInput.value = message;
            messageInput.focus();
            updateSendButton();
        });
    });

    // Message Input Handler
    function updateSendButton() {
        sendButton.disabled = !messageInput.value.trim();
        if (!isTyping && messageInput.value.trim()) {
            isTyping = true;
            showTypingIndicator(true);
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                isTyping = false;
                showTypingIndicator(false);
            }, 1000);
        }
        autoResizeTextarea();
    }

    messageInput.addEventListener('input', updateSendButton);

    function autoResizeTextarea() {
        messageInput.style.height = 'auto';
        const maxHeight = parseInt(getComputedStyle(messageInput).getPropertyValue('max-height'));
        messageInput.style.height = Math.min(messageInput.scrollHeight, maxHeight) + 'px';
    }

    // Send Message Handler
    function sendMessage() {
        const content = messageInput.value.trim();
        if (!content || !socket) return;

        socket.emit('chat_message', { content });
        addMessage(content, 'user');

        messageInput.value = '';
        sendButton.disabled = true;
        autoResizeTextarea();
    }

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // File Upload Handler
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                previewImage.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            previewImage.classList.add('hidden');
        }

        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        filePreview.classList.remove('hidden');
    });

    // Remove File Handler
    removeFileBtn.addEventListener('click', () => {
        fileInput.value = '';
        filePreview.classList.add('hidden');
        previewImage.src = '';
        fileName.textContent = '';
        fileSize.textContent = '';
    });

    // Helper Functions
    function addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;
        
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(timestamp);
        messagesContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function showTypingIndicator(show) {
        typingIndicator.classList.toggle('hidden', !show);
        if (show) scrollToBottom();
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});

// Promotional Banner Auto-rotation
document.addEventListener('DOMContentLoaded', function() {
    const slider = document.querySelector('.promo-slider');
    const slides = document.querySelectorAll('.promo-slide');
    const prevBtn = document.querySelector('.promo-nav.prev');
    const nextBtn = document.querySelector('.promo-nav.next');
    const dotsContainer = document.querySelector('.promo-dots');
    
    let currentSlide = 0;
    let slideInterval;
    const intervalTime = 5000; // Time between slides in milliseconds

    // Create dots
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });

    const dots = document.querySelectorAll('.dot');

    function updateDots() {
        dots.forEach(dot => dot.classList.remove('active'));
        dots[currentSlide].classList.add('active');
    }

    function goToSlide(index) {
        currentSlide = index;
        slider.style.transform = `translateX(-${currentSlide * 33.333}%)`;
        updateDots();
        resetInterval();
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        goToSlide(currentSlide);
    }

    function prevSlide() {
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        goToSlide(currentSlide);
    }

    function resetInterval() {
        clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, intervalTime);
    }

    // Event listeners
    prevBtn.addEventListener('click', () => {
        prevSlide();
        resetInterval();
    });

    nextBtn.addEventListener('click', () => {
        nextSlide();
        resetInterval();
    });

    // Touch events for mobile swipe
    let touchStartX = 0;
    let touchEndX = 0;

    slider.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    });

    slider.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }
    }

    // Start auto-rotation
    resetInterval();

    // Pause auto-rotation when hovering
    slider.addEventListener('mouseenter', () => clearInterval(slideInterval));
    slider.addEventListener('mouseleave', resetInterval);
});
