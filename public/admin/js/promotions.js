// Promotion Management JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize promotion management
    initializePromotions();

    // Add event listeners
    addEventListeners();
});

function initializePromotions() {
    // Load active promotions
    loadPromotions('active');
    // Load scheduled promotions
    loadPromotions('scheduled');
    // Load expired promotions
    loadPromotions('expired');
}

function loadPromotions(status) {
    // Simulated promotion data - replace with actual API call
    const promotions = [
        {
            id: 1,
            name: 'Welcome Bonus',
            description: '100% match up to $500 on first deposit',
            type: 'deposit',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            status: 'active',
            usageCount: 234,
            claimed: 12345,
            conversion: 65
        },
        // Add more promotion data...
    ];

    // Filter promotions based on status
    const filteredPromotions = promotions.filter(promo => promo.status === status);

    // Render promotions
    renderPromotions(filteredPromotions, status);
}

function renderPromotions(promotions, status) {
    const container = document.querySelector(`.promotions-section[data-status="${status}"] .promotions-grid`);
    if (!container) return;

    container.innerHTML = promotions.map(promo => `
        <div class="promotion-card" data-id="${promo.id}">
            <div class="promotion-header">
                <span class="badge ${promo.status}">${promo.status}</span>
                <div class="promotion-actions">
                    <button class="edit-btn" onclick="editPromotion(${promo.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="deletePromotion(${promo.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="promotion-body">
                <h3>${promo.name}</h3>
                <p>${promo.description}</p>
                <div class="promotion-details">
                    <div class="detail">
                        <i class="fas fa-calendar"></i>
                        <span>Ends: ${formatDate(promo.endDate)}</span>
                    </div>
                    <div class="detail">
                        <i class="fas fa-users"></i>
                        <span>Used: ${promo.usageCount} times</span>
                    </div>
                </div>
                <div class="promotion-stats">
                    <div class="stat">
                        <label>Claimed</label>
                        <span>$${promo.claimed.toLocaleString()}</span>
                    </div>
                    <div class="stat">
                        <label>Conversion</label>
                        <span>${promo.conversion}%</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function addEventListeners() {
    // Add Promotion Button
    const addButton = document.querySelector('.add-promotion-btn');
    if (addButton) {
        addButton.addEventListener('click', () => showPromotionModal());
    }

    // Search Input
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    // Modal Close Button
    const closeButton = document.querySelector('.close-modal');
    if (closeButton) {
        closeButton.addEventListener('click', hidePromotionModal);
    }

    // Promotion Form
    const promotionForm = document.getElementById('promotionForm');
    if (promotionForm) {
        promotionForm.addEventListener('submit', handlePromotionSubmit);
    }
}

function showPromotionModal(promotionId = null) {
    const modal = document.querySelector('.promotion-modal');
    const form = document.getElementById('promotionForm');
    
    if (promotionId) {
        // Edit mode - load promotion data
        const promotion = getPromotionById(promotionId);
        if (promotion) {
            fillPromotionForm(promotion);
        }
    } else {
        // Create mode - reset form
        form.reset();
    }

    modal.style.display = 'block';
}

function hidePromotionModal() {
    const modal = document.querySelector('.promotion-modal');
    modal.style.display = 'none';
}

function handlePromotionSubmit(event) {
    event.preventDefault();

    // Get form data
    const formData = new FormData(event.target);
    const promotionData = Object.fromEntries(formData.entries());

    // Validate form data
    if (!validatePromotionData(promotionData)) {
        return;
    }

    // Save promotion
    savePromotion(promotionData);

    // Hide modal
    hidePromotionModal();

    // Reload promotions
    initializePromotions();
}

function validatePromotionData(data) {
    // Add validation logic
    if (!data.name || !data.description) {
        showError('Name and description are required');
        return false;
    }

    if (!data.startDate || !data.endDate) {
        showError('Start and end dates are required');
        return false;
    }

    if (new Date(data.startDate) >= new Date(data.endDate)) {
        showError('End date must be after start date');
        return false;
    }

    return true;
}

function savePromotion(data) {
    // Add API call to save promotion
    console.log('Saving promotion:', data);
    // Implement actual API call here
}

function editPromotion(id) {
    showPromotionModal(id);
}

function deletePromotion(id) {
    if (confirm('Are you sure you want to delete this promotion?')) {
        // Add API call to delete promotion
        console.log('Deleting promotion:', id);
        // Implement actual API call here

        // Reload promotions
        initializePromotions();
    }
}

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const promotionCards = document.querySelectorAll('.promotion-card');

    promotionCards.forEach(card => {
        const name = card.querySelector('h3').textContent.toLowerCase();
        const description = card.querySelector('p').textContent.toLowerCase();
        
        if (name.includes(searchTerm) || description.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function generatePromoCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Utility Functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showError(message) {
    // Implement error display logic
    alert(message);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Helper function to get promotion by ID
function getPromotionById(id) {
    // Implement API call to get promotion
    // This is a mock implementation
    return {
        id: id,
        name: 'Test Promotion',
        description: 'Test Description',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        type: 'deposit',
        bonusAmount: 100,
        maxBonus: 500,
        minDeposit: 20,
        wageringReq: 30,
        eligibleGames: ['slots'],
        userGroups: ['all'],
        promoCode: 'TEST123',
        terms: 'Test terms and conditions'
    };
}

// Initialize tooltips, if using a tooltip library
function initializeTooltips() {
    // Implement tooltip initialization
}

// Initialize date pickers, if using a date picker library
function initializeDatePickers() {
    // Implement date picker initialization
}
