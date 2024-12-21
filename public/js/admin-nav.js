document.addEventListener('DOMContentLoaded', function() {
    // Initialize navigation
    initializeNavigation();
    
    // Initialize mobile menu
    initializeMobileMenu();
    
    // Show default page (dashboard)
    showPage('dashboard');
});

function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Get the page to show
            const pageId = this.getAttribute('data-page');
            showPage(pageId);
            
            // Close mobile menu if open
            if (window.innerWidth <= 768) {
                const navMenu = document.querySelector('.nav-menu');
                const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
                if (navMenu && mobileMenuToggle) {
                    navMenu.classList.remove('active');
                    mobileMenuToggle.setAttribute('aria-expanded', 'false');
                }
            }
        });
    });
}

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const selectedPage = document.getElementById(pageId);
    if (selectedPage) {
        selectedPage.classList.add('active');
        initializePage(pageId);
    }
}

function initializePage(pageId) {
    switch(pageId) {
        case 'dashboard':
            // Initialize dashboard charts and stats
            if (typeof updateDashboardStats === 'function') {
                updateDashboardStats();
            }
            break;
            
        case 'live-chat':
            // Initialize live chat functionality
            if (typeof initializeLiveChat === 'function') {
                initializeLiveChat();
            }
            break;
            
        case 'chat-history':
            // Initialize chat history
            if (typeof loadChatHistory === 'function') {
                loadChatHistory();
            }
            break;
            
        case 'analytics':
            // Initialize analytics charts
            if (typeof initializeAnalytics === 'function') {
                initializeAnalytics();
            }
            break;
            
        case 'settings':
            // Initialize settings
            if (typeof loadSettings === 'function') {
                loadSettings();
            }
            break;
    }
}

function initializeMobileMenu() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            this.setAttribute('aria-expanded', 
                navMenu.classList.contains('active'));
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!event.target.closest('.admin-nav') && 
                navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
}
