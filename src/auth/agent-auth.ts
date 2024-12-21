interface LoginResponse {
    token: string;
    agent: {
        id: string;
        username: string;
        role: 'admin' | 'agent';
        requiresTwoFactor: boolean;
    };
    requiresTwoFactor: boolean;
    message?: string;
}

interface ErrorResponse {
    message: string;
}

class AgentAuth {
    private static instance: AgentAuth;
    private sessionTimeout: number = 8 * 60 * 60 * 1000; // 8 hours
    private warningThreshold: number = 10 * 60 * 1000; // 10 minutes

    private constructor() {
        this.initializeEventListeners();
    }

    public static getInstance(): AgentAuth {
        if (!AgentAuth.instance) {
            AgentAuth.instance = new AgentAuth();
        }
        return AgentAuth.instance;
    }

    private showToast(message: string, type: 'info' | 'error' | 'success' = 'info'): void {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    private async handleLogin(event: Event): Promise<void> {
        event.preventDefault();
        
        const form = event.target as HTMLFormElement;
        const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        const username = (document.getElementById('username') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;
        const errorMessage = document.getElementById('errorMessage') as HTMLDivElement;

        submitBtn.classList.add('loading');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data: LoginResponse | ErrorResponse = await response.json();

            if (response.ok) {
                const loginData = data as LoginResponse;
                if (loginData.requiresTwoFactor) {
                    this.showStep('twoFactorStep');
                    this.startCodeTimer();
                } else {
                    localStorage.setItem('token', loginData.token);
                    localStorage.setItem('agent', JSON.stringify(loginData.agent));
                    window.location.href = loginData.agent.role === 'admin' 
                        ? '/admin-dashboard.html' 
                        : '/agent-dashboard.html';
                }
            } else {
                const errorData = data as ErrorResponse;
                errorMessage.textContent = errorData.message || 'Login failed';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'An error occurred during login';
            errorMessage.style.display = 'block';
        } finally {
            submitBtn.classList.remove('loading');
        }
    }

    private showStep(stepId: string): void {
        document.querySelectorAll('.login-step').forEach(step => {
            step.classList.remove('active');
        });
        document.getElementById(stepId)?.classList.add('active');
    }

    private startCodeTimer(): void {
        let timeLeft = 30;
        const timerElement = document.getElementById('codeTimer');
        
        if (!timerElement) return;

        const timer = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft.toString();
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                timerElement.textContent = '0';
            }
        }, 1000);
    }

    private initializeOTPInputs(): void {
        const inputs = document.querySelectorAll('.otp-input') as NodeListOf<HTMLInputElement>;
        
        inputs.forEach((input, index) => {
            input.addEventListener('keyup', (e) => {
                if (e.key >= '0' && e.key <= '9') {
                    if (index < inputs.length - 1) {
                        inputs[index + 1].focus();
                    }
                } else if (e.key === 'Backspace') {
                    if (index > 0) {
                        inputs[index - 1].focus();
                    }
                }
            });
        });
    }

    private initializeEventListeners(): void {
        document.addEventListener('DOMContentLoaded', () => {
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', this.handleLogin.bind(this));
            }

            this.initializeOTPInputs();
            this.showStep('loginStep');
        });
    }
}

// Initialize the auth handler
const authHandler = AgentAuth.getInstance();
