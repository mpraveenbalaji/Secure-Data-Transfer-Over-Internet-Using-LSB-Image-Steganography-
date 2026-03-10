 // Authentication module
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.users = JSON.parse(localStorage.getItem('steg_users') || '[]');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthState();
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Register form
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Auth navigation
        document.getElementById('showRegisterBtn').addEventListener('click', () => {
            this.showPage('registerPage');
        });

        document.getElementById('showLoginBtn').addEventListener('click', () => {
            this.showPage('loginPage');
        });

        // Get started button
        document.getElementById('getStartedBtn').addEventListener('click', () => {
            this.showPage('loginPage');
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Password toggles
        document.getElementById('loginPasswordToggle').addEventListener('click', () => {
            this.togglePasswordVisibility('loginPassword', 'loginPasswordToggle');
        });

        document.getElementById('registerPasswordToggle').addEventListener('click', () => {
            this.togglePasswordVisibility('registerPassword', 'registerPasswordToggle');
        });
    }

    checkAuthState() {
        const savedUser = localStorage.getItem('steg_current_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showAuthenticatedState();
        } else {
            this.showPage('landingPage');
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            // Validation
            if (!email || !password) {
                throw new Error('Please fill in all fields');
            }

            // Call backend API
            const response = await fetch('http://127.0.0.1:5000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Login failed');
            }

            const data = await response.json();

            // Login successful
            this.currentUser = { 
                id: data.user.id, 
                name: data.user.name, 
                email: data.user.email 
            };
            localStorage.setItem('steg_current_user', JSON.stringify(this.currentUser));
            
            this.showAuthenticatedState();
            this.showToast('Login successful! Welcome back.', 'success');

        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async handleRegister() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        try {
            // Validation
            if (!name || !email || !password || !confirmPassword) {
                throw new Error('Please fill in all fields');
            }

            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }

            // Call backend API to register
            const response = await fetch('http://127.0.0.1:5000/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Registration failed');
            }

            // After successful registration, auto login
            const loginResponse = await fetch('http://localhost:5000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            if (!loginResponse.ok) {
                throw new Error('Registration successful but login failed');
            }

            const loginData = await loginResponse.json();

            // Auto login
            this.currentUser = { 
                id: loginData.user.id, 
                name: loginData.user.name, 
                email: loginData.user.email 
            };
            localStorage.setItem('steg_current_user', JSON.stringify(this.currentUser));

            this.showAuthenticatedState();
            this.showToast('Account created successfully! Welcome to SecureSteg.', 'success');

        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('steg_current_user');
        this.showPage('landingPage');
        document.getElementById('navbar').style.display = 'none';
        this.showToast('Logged out successfully', 'success');
    }

    showAuthenticatedState() {
        document.getElementById('navbar').style.display = 'block';
        document.getElementById('userName').textContent = this.currentUser.name;
        this.showPage('dashboardPage');
    }

    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
        });

        // Show target page
        document.getElementById(pageId).style.display = 'block';

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`[data-page="${pageId.replace('Page', '')}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    togglePasswordVisibility(inputId, toggleId) {
        const input = document.getElementById(inputId);
        const toggle = document.getElementById(toggleId);
        const icon = toggle.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const icon = toast.querySelector('.toast-icon');
        const messageEl = toast.querySelector('.toast-message');

        // Set icon based on type
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        icon.className = `toast-icon ${icons[type] || icons.info}`;
        messageEl.textContent = message;
        
        // Remove existing type classes and add new one
        toast.classList.remove('success', 'error', 'warning', 'info');
        toast.classList.add(type);
        
        // Show toast
        toast.classList.add('show');

        // Hide after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }
}

// Export for use in other modules
window.AuthManager = AuthManager;