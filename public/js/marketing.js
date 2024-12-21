// Marketing Page Management
class MarketingManager {
    constructor() {
        this.apiUrl = 'https://your-domain.com/api';
        this.initializeEventListeners();
        this.loadMarketingData();
    }

    initializeEventListeners() {
        // Hero Section
        document.getElementById('saveHeroBtn')?.addEventListener('click', () => this.saveHeroSection());
        
        // Announcements
        document.getElementById('addAnnouncementBtn')?.addEventListener('click', () => this.showAnnouncementModal());
        
        // Features
        document.getElementById('addFeatureBtn')?.addEventListener('click', () => this.addNewFeature());
        
        // SEO
        document.getElementById('saveSeoBtn')?.addEventListener('click', () => this.saveSeoSettings());

        // Initialize file upload preview
        const fileInput = document.querySelector('.image-upload input[type="file"]');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        // Initialize announcement actions
        document.querySelectorAll('.announcement-actions button').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleAnnouncementAction(e));
        });

        // Initialize feature actions
        document.querySelectorAll('.feature-actions button').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFeatureAction(e));
        });
    }

    async loadMarketingData() {
        try {
            // Load current marketing data from localStorage or API
            const marketingData = await this.fetchMarketingData();
            this.updateUI(marketingData);
        } catch (error) {
            console.error('Error loading marketing data:', error);
            this.showNotification('Error loading marketing data', 'error');
        }
    }

    async fetchMarketingData() {
        try {
            const [hero, announcements, features, seo] = await Promise.all([
                fetch(`${this.apiUrl}/marketing.php?route=hero`).then(res => res.json()),
                fetch(`${this.apiUrl}/marketing.php?route=announcements`).then(res => res.json()),
                fetch(`${this.apiUrl}/marketing.php?route=features`).then(res => res.json()),
                fetch(`${this.apiUrl}/marketing.php?route=seo&page=index`).then(res => res.json())
            ]);

            return {
                hero: {
                    heading: hero.title,
                    subheading: hero.content,
                    imageUrl: hero.image_url
                },
                announcements,
                features,
                seo: {
                    title: seo.title,
                    description: seo.description,
                    keywords: seo.keywords
                }
            };
        } catch (error) {
            console.error('Error fetching marketing data:', error);
            throw error;
        }
    }

    async saveHeroSection() {
        try {
            const formData = new FormData();
            const fileInput = document.querySelector('.image-upload input[type="file"]');
            
            if (fileInput.files[0]) {
                formData.append('image', fileInput.files[0]);
            }

            const heroData = {
                heading: document.querySelector('input[placeholder="Enter main heading"]').value,
                subheading: document.querySelector('textarea[placeholder="Enter subheading"]').value,
                ctaText: document.querySelector('input[placeholder="Button text"]').value
            };

            formData.append('data', JSON.stringify(heroData));

            const response = await fetch(`${this.apiUrl}/marketing.php?route=hero`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Failed to save hero section');

            this.showNotification('Hero section updated successfully', 'success');
            await this.updateIndexPage(heroData);
        } catch (error) {
            console.error('Error saving hero section:', error);
            this.showNotification('Error saving hero section', 'error');
        }
    }

    async updateIndexPage(heroData) {
        // Update index.html hero section
        const heroSection = document.querySelector('#hero-section');
        if (heroSection) {
            heroSection.querySelector('h1').textContent = heroData.heading;
            heroSection.querySelector('p').textContent = heroData.subheading;
            heroSection.querySelector('.cta-button').textContent = heroData.ctaText;
            heroSection.querySelector('.hero-image img').src = heroData.imageUrl;
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.querySelector('.preview img').src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    showAnnouncementModal() {
        // Implement announcement modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>New Announcement</h2>
                <form id="announcementForm">
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" name="title" required>
                    </div>
                    <div class="form-group">
                        <label>Content</label>
                        <textarea name="content" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>Type</label>
                        <select name="type">
                            <option value="Featured">Featured</option>
                            <option value="New Feature">New Feature</option>
                            <option value="Update">Update</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Target Audience</label>
                        <select name="target">
                            <option value="All Users">All Users</option>
                            <option value="Premium Users">Premium Users</option>
                            <option value="New Users">New Users</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary">Save</button>
                        <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async handleAnnouncementAction(event) {
        const button = event.target.closest('button');
        const announcement = button.closest('.announcement-item');
        const action = button.querySelector('i').className;
        const id = announcement.dataset.id;

        try {
            if (action.includes('trash')) {
                await fetch(`${this.apiUrl}/marketing.php?route=announcements&id=${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.getAuthToken()}`
                    }
                });
                announcement.remove();
                this.showNotification('Announcement deleted successfully', 'success');
            } else if (action.includes('edit')) {
                this.showAnnouncementModal(announcement);
            }
        } catch (error) {
            console.error('Error handling announcement action:', error);
            this.showNotification('Error processing request', 'error');
        }
    }

    async saveAnnouncement(formData) {
        try {
            const response = await fetch(`${this.apiUrl}/marketing.php?route=announcements`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to save announcement');

            const result = await response.json();
            this.showNotification('Announcement saved successfully', 'success');
            return result.id;
        } catch (error) {
            console.error('Error saving announcement:', error);
            this.showNotification('Error saving announcement', 'error');
            throw error;
        }
    }

    addNewFeature() {
        const featuresList = document.querySelector('.features-list');
        const newFeature = document.createElement('div');
        newFeature.className = 'feature-item';
        newFeature.innerHTML = `
            <div class="feature-icon">
                <i class="fas fa-star"></i>
            </div>
            <div class="feature-content">
                <input type="text" placeholder="Feature title">
                <textarea placeholder="Feature description"></textarea>
            </div>
            <div class="feature-actions">
                <button class="btn btn-icon"><i class="fas fa-arrows-alt"></i></button>
                <button class="btn btn-icon danger"><i class="fas fa-trash"></i></button>
            </div>
        `;
        featuresList.appendChild(newFeature);
    }

    handleFeatureAction(event) {
        const button = event.target.closest('button');
        const feature = button.closest('.feature-item');
        const action = button.querySelector('i').className;

        if (action.includes('trash')) {
            feature.remove();
        }
    }

    async saveSeoSettings() {
        try {
            const seoData = {
                page_name: 'index',
                title: document.querySelector('input[placeholder="Enter page title"]').value,
                description: document.querySelector('textarea[placeholder="Enter meta description"]').value,
                keywords: document.querySelector('input[placeholder="Enter keywords (comma-separated)"]').value
            };

            const response = await fetch(`${this.apiUrl}/marketing.php?route=seo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(seoData)
            });

            if (!response.ok) throw new Error('Failed to save SEO settings');

            this.showNotification('SEO settings saved successfully', 'success');
            this.updateMetaTags(seoData);
        } catch (error) {
            console.error('Error saving SEO settings:', error);
            this.showNotification('Error saving SEO settings', 'error');
        }
    }

    updateUI(data) {
        // Update Hero Section
        if (data.hero) {
            document.querySelector('input[placeholder="Enter main heading"]').value = data.hero.heading;
            document.querySelector('textarea[placeholder="Enter subheading"]').value = data.hero.subheading;
            document.querySelector('input[placeholder="Button text"]').value = data.hero.ctaText;
            document.querySelector('.preview img').src = data.hero.imageUrl;
        }

        // Update SEO Settings
        if (data.seo) {
            document.querySelector('input[placeholder="Enter page title"]').value = data.seo.title;
            document.querySelector('textarea[placeholder="Enter meta description"]').value = data.seo.description;
            document.querySelector('input[placeholder="Enter keywords (comma-separated)"]').value = data.seo.keywords;
        }

        this.updateCharacterCounts();
    }

    updateCharacterCounts() {
        const titleInput = document.querySelector('input[placeholder="Enter page title"]');
        const descriptionInput = document.querySelector('textarea[placeholder="Enter meta description"]');

        titleInput.addEventListener('input', () => {
            const count = titleInput.value.length;
            titleInput.nextElementSibling.textContent = `${count}/60`;
        });

        descriptionInput.addEventListener('input', () => {
            const count = descriptionInput.value.length;
            descriptionInput.nextElementSibling.textContent = `${count}/160`;
        });
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    getAuthToken() {
        // Implement your authentication token retrieval logic here
        return localStorage.getItem('authToken');
    }

    updateMetaTags(seoData) {
        document.title = seoData.title;
        document.querySelector('meta[name="description"]').content = seoData.description;
        document.querySelector('meta[name="keywords"]').content = seoData.keywords;
    }
}

// Initialize Marketing Manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const marketingManager = new MarketingManager();
});
