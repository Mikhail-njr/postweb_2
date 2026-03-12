/**
 * Header Component - Shared navigation header for all pages
 */

export class Header {
  constructor() {
    this.currentPage = '';
    this.themeService = null;
  }

  /**
   * Set theme service reference
   */
  setThemeService(themeService) {
    this.themeService = themeService;
  }

  /**
   * Render the header with navigation
   * @param {string} currentPage - The current active page path
   */
  render(currentPage = '') {
    this.currentPage = currentPage;
    const currentTheme = this.themeService?.getCurrentTheme() || 'claro';
    
    return `
      <header class="dashboard-header">
        <h1>SIS-POST - Punto de Venta</h1>
        <nav class="main-nav">
          <a href="#" onclick="window.Router.navigate('/'); return false;" class="nav-link ${this.isActive('/') ? 'active' : ''}">POS</a>
          <a href="#" onclick="window.Router.navigate('/products'); return false;" class="nav-link ${this.isActive('/products') ? 'active' : ''}">Productos</a>
          <a href="#" onclick="window.Router.navigate('/lotes'); return false;" class="nav-link ${this.isActive('/lotes') ? 'active' : ''}">Lotes</a>
          <a href="#" onclick="window.Router.navigate('/customers'); return false;" class="nav-link ${this.isActive('/customers') ? 'active' : ''}">Clientes</a>
          <a href="#" onclick="window.Router.navigate('/sales'); return false;" class="nav-link ${this.isActive('/sales') ? 'active' : ''}">Ventas</a>
          <a href="#" onclick="window.Router.navigate('/caja'); return false;" class="nav-link ${this.isActive('/caja') ? 'active' : ''}">Caja</a>
          <a href="#" onclick="window.Router.navigate('/promotions'); return false;" class="nav-link ${this.isActive('/promotions') ? 'active' : ''}">Promociones</a>
        </nav>
        <div class="user-info">
          <!-- Theme Selector -->
          <div class="theme-selector" id="theme-selector">
            <button class="theme-btn theme-claro ${currentTheme === 'claro' ? 'active' : ''}" 
                    data-theme="claro" 
                    title="Tema Claro (Día)"
                    onclick="window.handleThemeChange('claro')">
              ☀️
            </button>
            <button class="theme-btn theme-tarde ${currentTheme === 'tarde' ? 'active' : ''}" 
                    data-theme="tarde" 
                    title="Tema Tarde"
                    onclick="window.handleThemeChange('tarde')">
              🌅
            </button>
            <button class="theme-btn theme-noche ${currentTheme === 'noche' ? 'active' : ''}" 
                    data-theme="noche" 
                    title="Tema Oscuro (Noche)"
                    onclick="window.handleThemeChange('noche')">
              🌙
            </button>
          </div>
          <span id="user-name"></span>
          <button id="logout-btn" class="btn btn-secondary">Cerrar Sesión</button>
        </div>
      </header>
    `;
  }

  /**
   * Check if a page is active
   */
  isActive(page) {
    if (page === '/') {
      return this.currentPage === '/' || this.currentPage === '' || !this.currentPage;
    }
    return this.currentPage.startsWith(page);
  }

  /**
   * Attach event listeners after render
   */
  attachEvents() {
    // Logout button handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.Router.navigate('/login');
      });
    }

    // Update user name display
    const userName = document.getElementById('user-name');
    if (userName) {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      userName.textContent = user.nombre || 'Usuario';
    }
  }

  /**
   * Update theme buttons active state
   */
  updateThemeButtons(currentTheme) {
    const buttons = document.querySelectorAll('.theme-btn');
    buttons.forEach(btn => {
      if (btn.dataset.theme === currentTheme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
}

export default Header;
