class ApiService {
    constructor() {
        this.baseUrl = 'http://159.223.39.100';
        this.token = localStorage.getItem('token');
        this.refreshToken = localStorage.getItem('refreshToken');
    }
    
    // Headers with authentication and CORS
    get headers() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };
    }

    // Handle API responses
    async handleResponse(response) {
        if (response.status === 401) {
            // Token expired, try to refresh
            const refreshed = await this.refreshAuthToken();
            if (refreshed) {
                // Retry the original request
                return this.retryRequest(response.url, response.options);
            } else {
                // Redirect to login
                window.location.href = '/login.html';
                throw new Error('Session expired');
            }
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }
        return data;
    }

    // Refresh authentication token
    async refreshAuthToken() {
        try {
            const response = await fetch(`${this.baseUrl}/api/auth/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                this.token = data.accessToken;
                localStorage.setItem('token', data.accessToken);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }

    // Retry failed request with new token
    async retryRequest(url, options) {
        options.headers = {
            ...options.headers,
            Authorization: `Bearer ${this.token}`
        };
        const response = await fetch(url, options);
        return this.handleResponse(response);
    }

    // API Methods
    async login(username, password) {
        const response = await fetch(`${this.baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        const data = await this.handleResponse(response);
        this.token = data.accessToken;
        this.refreshToken = data.refreshToken;
        localStorage.setItem('token', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        return data;
    }

    async getChatHistory(chatId) {
        return this.request(`${this.baseUrl}/api/chats/${chatId}/history`, {
            method: 'GET'
        });
    }

    async sendMessage(chatId, message) {
        return this.request(`${this.baseUrl}/api/chats/${chatId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ message })
        });
    }

    async getActiveChats() {
        return this.request(`${this.baseUrl}/api/chats/active`, {
            method: 'GET'
        });
    }

    async updateAgentStatus(status) {
        return this.request(`${this.baseUrl}/api/agents/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    async getDashboardStats() {
        return this.request(`${this.baseUrl}/api/admin/stats`, {
            method: 'GET'
        });
    }

    // Error handling with automatic retry and network check
    async request(url, options, retries = 3) {
        try {
            if (!navigator.onLine) {
                throw new Error('No internet connection');
            }

            const response = await fetch(url, {
                ...options,
                credentials: 'include',
                headers: {
                    ...this.headers,
                    ...options.headers
                }
            });
            return await this.handleResponse(response);
        } catch (error) {
            if (retries > 0 && !error.message.includes('Session expired')) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.request(url, options, retries - 1);
            }
            throw error;
        }
    }
}

// Export as singleton
const apiService = new ApiService();
Object.freeze(apiService);
export default apiService;