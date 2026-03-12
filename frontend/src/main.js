/**
 * Main entry point for POS Frontend
 */

import { Router } from './core/Router.js';
import { Store } from './core/Store.js';
import { ApiClient } from './core/ApiClient.js';
import { EventBus } from './core/EventBus.js';
import { AuthService, ProductService, SaleService, CustomerService, DebtService, CajaService, promotionService } from './services/index.js';
import { ThemeService, themeService } from './services/ThemeService.js';
import { DashboardPage } from './pages/Dashboard/DashboardPage.js';
import { ProductsPage } from './pages/Products/ProductsPage.js';
import { CustomersPage } from './pages/Customers/CustomersPage.js';
import { SalesPage } from './pages/Sales/SalesPage.js';
import { CajaPage } from './pages/Caja/CajaPage.js';
import { LotesPage } from './pages/Lotes/LotesPage.js';
import { PromotionsPage } from './pages/Promotions/PromotionsPage.js';

// Initialize core modules
window.EventBus = new EventBus();
window.Store = new Store();
window.ApiClient = new ApiClient('/api');

// Initialize Theme Service (before other services)
window.ThemeService = ThemeService;
window.themeService = themeService;

// Initialize services
window.Services = {
  auth: new AuthService(window.ApiClient),
  product: new ProductService(window.ApiClient),
  sale: new SaleService(window.ApiClient),
  customer: new CustomerService(window.ApiClient),
  debt: new DebtService(window.ApiClient),
  caja: new CajaService(window.ApiClient),
  promotion: promotionService
};

// Global function to handle theme changes (called from Header)
window.handleThemeChange = function(themeName) {
  window.themeService.applyTheme(themeName);
  // Update header buttons if header exists
  const header = document.querySelector('.dashboard-header');
  if (header) {
    const buttons = header.querySelectorAll('.theme-btn');
    buttons.forEach(btn => {
      if (btn.dataset.theme === themeName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
};

// Initialize router
window.Router = new Router();

// Define routes
window.Router.define({
  '/': () => {
    // Check if user is authenticated
    if (!window.Services.auth.isAuthenticated()) {
      window.Router.navigate('/login');
      return;
    }
    renderDashboard();
  },
  '/login': () => {
    renderLogin();
  },
  '/dashboard': () => {
    if (!window.Services.auth.isAuthenticated()) {
      window.Router.navigate('/login');
      return;
    }
    renderDashboard();
  },
  '/products': () => {
    if (!window.Services.auth.isAuthenticated()) {
      window.Router.navigate('/login');
      return;
    }
    renderProducts();
  },
  '/customers': () => {
    if (!window.Services.auth.isAuthenticated()) {
      window.Router.navigate('/login');
      return;
    }
    renderCustomers();
  },
  '/sales': () => {
    if (!window.Services.auth.isAuthenticated()) {
      window.Router.navigate('/login');
      return;
    }
    renderSales();
  },
  '/caja': () => {
    if (!window.Services.auth.isAuthenticated()) {
      window.Router.navigate('/login');
      return;
    }
    renderCaja();
  },
  '/lotes': () => {
    if (!window.Services.auth.isAuthenticated()) {
      window.Router.navigate('/login');
      return;
    }
    renderLotes();
  },
  '/promotions': () => {
    if (!window.Services.auth.isAuthenticated()) {
      window.Router.navigate('/login');
      return;
    }
    renderPromotions();
  },
  '/debts': () => {
    if (!window.Services.auth.isAuthenticated()) {
      window.Router.navigate('/login');
      return;
    }
    renderDebts();
  }
});

// Render functions
function renderDashboard() {
  const app = document.getElementById('app');
  const page = new DashboardPage(app, window.Services);
  page.render();
}

function renderLogin() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login-container">
      <div class="login-box">
        <h1>SIS-POST</h1>
        <h2>Iniciar Sesión</h2>
        <form id="login-form">
          <div class="form-group">
            <label for="username">Usuario:</label>
            <input type="text" id="username" name="username" required />
          </div>
          <div class="form-group">
            <label for="password">Contraseña:</label>
            <input type="password" id="password" name="password" required />
          </div>
          <button type="submit" class="btn btn-primary">Ingresar</button>
        </form>
        <div id="login-error" class="error-message"></div>
      </div>
    </div>
  `;

  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
      await window.Services.auth.login(username, password);
      window.Router.navigate('/');
    } catch (error) {
      errorDiv.textContent = error.message || 'Error al iniciar sesión';
    }
  });
}

function renderProducts() {
  const app = document.getElementById('app');
  const page = new ProductsPage(app, window.Services);
  page.render();
}

function renderCustomers() {
  const app = document.getElementById('app');
  const page = new CustomersPage(app, window.Services);
  page.render();
}

function renderSales() {
  const app = document.getElementById('app');
  const page = new SalesPage(app, window.Services);
  page.render();
}

function renderCaja() {
  const app = document.getElementById('app');
  const page = new CajaPage(app, window.Services);
  page.render();
}

function renderLotes() {
  const app = document.getElementById('app');
  const page = new LotesPage(app, window.Services);
  page.render();
}

function renderPromotions() {
  const app = document.getElementById('app');
  const page = new PromotionsPage(app);
  page.init();
}

function renderDebts() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page-container">
      <h1>Cuenta Corriente</h1>
      <div class="page-content">
        <p>Cuenta corriente - En desarrollo</p>
        <button onclick="window.Router.navigate('/')" class="btn btn-secondary">Volver al Dashboard</button>
      </div>
    </div>
  `;
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  console.log('SIS-POST Frontend initialized');
  
  // Initialize theme from localStorage or default
  const currentTheme = window.themeService.init();
  console.log(`Theme loaded: ${currentTheme}`);
  
  // Start router
  window.Router.init();
});
