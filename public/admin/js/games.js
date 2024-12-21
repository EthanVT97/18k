// Games Management JavaScript

class GamesManager {
    constructor() {
        this.games = [];
        this.currentCategory = 'all';
        this.setupEventListeners();
        this.loadGames();
    }

    setupEventListeners() {
        // Category buttons
        document.querySelectorAll('.category').forEach(button => {
            button.addEventListener('click', (e) => {
                this.handleCategoryChange(e.target.dataset.category);
            });
        });

        // Search functionality
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Add new game button
        const addGameBtn = document.querySelector('.add-game-btn');
        if (addGameBtn) {
            addGameBtn.addEventListener('click', () => this.showGameModal());
        }

        // Game form submission
        const gameForm = document.getElementById('gameForm');
        if (gameForm) {
            gameForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleGameSubmit(e.target);
            });
        }
    }

    loadGames() {
        // Simulated game data - replace with actual API call
        this.games = [
            {
                id: 'GAME001',
                name: 'Mega Slots',
                category: 'slots',
                image: 'https://via.placeholder.com/200x150',
                players: 1234,
                rtp: 95,
                tags: ['Popular', 'New'],
                status: 'active'
            },
            // Add more game data...
        ];

        this.renderGames();
    }

    renderGames() {
        const gamesGrid = document.querySelector('.games-grid');
        if (!gamesGrid) return;

        const filteredGames = this.currentCategory === 'all' 
            ? this.games 
            : this.games.filter(game => game.category === this.currentCategory);

        gamesGrid.innerHTML = filteredGames.map(game => `
            <div class="game-card" data-id="${game.id}">
                <div class="game-image">
                    <img src="${game.image}" alt="${game.name}">
                    <div class="game-overlay">
                        <button onclick="gamesManager.editGame('${game.id}')" class="edit-game">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="gamesManager.toggleGame('${game.id}')" 
                                class="toggle-game ${game.status === 'active' ? 'active' : ''}">
                            <i class="fas fa-toggle-${game.status === 'active' ? 'on' : 'off'}"></i>
                        </button>
                        <button onclick="gamesManager.deleteGame('${game.id}')" class="delete-game">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="game-info">
                    <h3>${game.name}</h3>
                    <div class="game-stats">
                        <span><i class="fas fa-users"></i> ${(game.players/1000).toFixed(1)}K</span>
                        <span><i class="fas fa-trophy"></i> ${game.rtp}%</span>
                    </div>
                    <div class="game-tags">
                        ${game.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
            </div>
        `).join('');

        this.updateAnalytics();
    }

    updateAnalytics() {
        // Update Most Played Games
        const mostPlayed = [...this.games]
            .sort((a, b) => b.players - a.players)
            .slice(0, 5);

        const mostPlayedList = document.querySelector('.analytic-card:first-child .game-list');
        if (mostPlayedList) {
            mostPlayedList.innerHTML = mostPlayed.map(game => `
                <div class="game-item">
                    <img src="${game.image}" alt="${game.name}">
                    <div class="game-details">
                        <span class="game-name">${game.name}</span>
                        <span class="game-plays">${game.players.toLocaleString()} plays</span>
                    </div>
                </div>
            `).join('');
        }

        // Update Highest Revenue Games
        // This would typically come from your backend with actual revenue data
        const highestRevenue = [...this.games]
            .sort((a, b) => (b.rtp * b.players) - (a.rtp * a.players))
            .slice(0, 5);

        const revenueList = document.querySelector('.analytic-card:last-child .game-list');
        if (revenueList) {
            revenueList.innerHTML = highestRevenue.map(game => `
                <div class="game-item">
                    <img src="${game.image}" alt="${game.name}">
                    <div class="game-details">
                        <span class="game-name">${game.name}</span>
                        <span class="game-revenue">$${((game.rtp * game.players)/100).toLocaleString()}</span>
                    </div>
                </div>
            `).join('');
        }
    }

    handleCategoryChange(category) {
        document.querySelectorAll('.category').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        this.currentCategory = category;
        this.renderGames();
    }

    handleSearch(query) {
        if (!query) {
            this.loadGames();
            return;
        }

        const searchQuery = query.toLowerCase();
        this.games = this.games.filter(game => 
            game.name.toLowerCase().includes(searchQuery) ||
            game.category.toLowerCase().includes(searchQuery)
        );

        this.renderGames();
    }

    showGameModal(gameId = null) {
        const modal = document.querySelector('.game-modal');
        if (!modal) return;

        const game = gameId ? this.games.find(g => g.id === gameId) : null;
        
        // Update modal title
        modal.querySelector('.modal-header h2').textContent = game ? 'Edit Game' : 'Add New Game';

        // Fill form if editing
        if (game) {
            modal.querySelector('[name="gameName"]').value = game.name;
            modal.querySelector('[name="category"]').value = game.category;
            modal.querySelector('[name="rtp"]').value = game.rtp;
            // Fill other fields...
        }

        modal.style.display = 'block';
    }

    handleGameSubmit(form) {
        const formData = new FormData(form);
        const gameData = {
            id: 'GAME' + Math.random().toString(36).substr(2, 6),
            name: formData.get('gameName'),
            category: formData.get('category'),
            rtp: formData.get('rtp'),
            status: formData.get('status'),
            players: 0,
            tags: [],
            image: 'https://via.placeholder.com/200x150' // Replace with actual image upload
        };

        this.games.push(gameData);
        this.renderGames();

        // Close modal
        document.querySelector('.game-modal').style.display = 'none';
    }

    editGame(gameId) {
        this.showGameModal(gameId);
    }

    toggleGame(gameId) {
        const game = this.games.find(g => g.id === gameId);
        if (game) {
            game.status = game.status === 'active' ? 'inactive' : 'active';
            this.renderGames();
        }
    }

    deleteGame(gameId) {
        if (confirm('Are you sure you want to delete this game?')) {
            this.games = this.games.filter(g => g.id !== gameId);
            this.renderGames();
        }
    }
}

// Initialize Games Manager
const gamesManager = new GamesManager();

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
