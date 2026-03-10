/**
 * Header Component - Shared navigation header for all pages
 */

export class Header {
  constructor() {
    this.currentPage = '';
  }

  /**
   * Render the header with navigation
   * @param {string} currentPage - The current active page path
   */
  render(currentPage = '') {
    this.currentPage = currentPage;
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
        </nav>
        <div class="user-info">
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
}

export default Header;
