// Navigation module
class NavigationManager {
    constructor(authManager) {
        this.authManager = authManager;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Navigation links
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                const page = e.currentTarget.getAttribute('data-page');
                this.navigateTo(page);
            });
        });

        // Dashboard action cards
        document.querySelectorAll('.dashboard-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('data-action');
                if (action) {
                    this.navigateTo(action);
                }
            });
        });

        // Dashboard buttons
        document.querySelectorAll('.dashboard-card .btn[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click
                const page = e.currentTarget.getAttribute('data-page');
                this.navigateTo(page);
            });
        });

        // Back buttons
        document.querySelectorAll('.back-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.getAttribute('data-page');
                this.navigateTo(page);
            });
        });
    }

    navigateTo(page) {
        if (!this.authManager.isAuthenticated() && page !== 'landing') {
            this.authManager.showPage('loginPage');
            return;
        }

        const pageMap = {
            'dashboard': 'dashboardPage',
            'encode': 'encodePage',
            'decode': 'decodePage',
            'inbox': 'inboxPage',
            'landing': 'landingPage'
        };

        const targetPage = pageMap[page] || page;
        this.showPage(targetPage);
    }

    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
        });

        // Show target page
        document.getElementById(pageId).style.display = 'block';

        // Update navigation active state
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const pageKey = pageId.replace('Page', '');
        const activeLink = document.querySelector(`[data-page="${pageKey}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Reset forms and states when navigating
        this.resetPageState(pageId);
    }

    resetPageState(pageId) {
        if (pageId === 'encodePage') {
            // Reset encode page
            document.getElementById('encodeResult').style.display = 'none';
            document.getElementById('encodeProgress').style.display = 'none';
        } else if (pageId === 'decodePage') {
            // Reset decode page
            document.getElementById('decodeResult').style.display = 'none';
            document.getElementById('decodeProgress').style.display = 'none';
        } else if (pageId === 'inboxPage') {
            // Initialize inbox page
            if (window.steganographyApp) {
                window.steganographyApp.initializeInboxPage();
            }
        }
    }
}

// Export for use in other modules
window.NavigationManager = NavigationManager;