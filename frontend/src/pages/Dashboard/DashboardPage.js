/**
 * Dashboard Page - Vista principal del POS
 */

import Header from '../../components/Header/Header.js';

export class DashboardPage {
  constructor(container, services) {
    this.container = container;
    this.services = services;
    this.products = [];
    this.cart = [];
    this.header = new Header();
  }

  async render() {
    this.container.innerHTML = `
      <div class="dashboard">
        ${this.header.render('/')}
        
        <div class="dashboard-content">
          <aside class="products-panel">
            <div class="search-bar">
              <input type="text" id="product-search" placeholder="Buscar productos o escanear código..." />
              <button id="barcode-btn" class="btn btn-primary" title="Escanear código de barras">📷</button>
            </div>
            <div class="categories">
              <button class="category-btn active" data-category="all">Todos</button>
            </div>
            <div id="products-grid" class="products-grid">
              <!-- Products will be loaded here -->
            </div>
          </aside>
          
          <main class="cart-panel">
            <div class="cart-header">
              <h2>Carrito de Compras</h2>
              <button id="clear-cart" class="btn btn-danger">Limpiar</button>
            </div>
            <div id="cart-items" class="cart-items">
              <!-- Cart items will be loaded here -->
            </div>
            <div class="cart-footer">
              <div class="cart-total">
                <span>Total:</span>
                <span id="cart-total">$0.00</span>
              </div>
              <div class="cart-actions">
                <button id="hold-sale" class="btn btn-secondary">Guardar</button>
                <button id="process-sale" class="btn btn-primary">Procesar Venta</button>
              </div>
            </div>
          </main>
          
          <aside class="info-panel">
            <div class="info-section">
              <h3>Información</h3>
              <div id="quick-info">
                <p>Cargando...</p>
              </div>
            </div>
            <div class="info-section">
              <h3>Últimas Ventas</h3>
              <div id="recent-sales">
                <p>Cargando...</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;
    
    await this.loadProducts();
    this.bindEvents();
    this.loadUserInfo();
    this.loadQuickInfo();
    this.header.attachEvents();
  }

  async searchByBarcode(barcode) {
    try {
      const response = await this.services.product.searchByBarcode(barcode);
      if (response.found) {
        // Add product to cart
        this.addToCart(response.id);
        // Clear search input
        const searchInput = document.getElementById('product-search');
        if (searchInput) searchInput.value = '';
      } else {
        this.showError('Producto no encontrado: ' + barcode);
      }
    } catch (error) {
      console.error('Error searching barcode:', error);
      this.showError('Error al buscar código de barras');
    }
  }

  openBarcodeScanner() {
    // Create a simple modal for barcode input
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h3>Escanear Código de Barras</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p>Ingrese el código de barras manualmente:</p>
          <input type="text" id="manual-barcode" class="form-input" 
                 placeholder="Código de barras" autofocus />
          <button id="search-barcode-btn" class="btn btn-primary" style="margin-top: 10px; width: 100%;">
            Buscar Producto
          </button>
          <hr style="margin: 20px 0;" />
          <p style="text-align: center; color: #666;">
            O use un lector de código de barras externo.
            El código se detectará automáticamente al escribir 
            en el campo de búsqueda principal.
          </p>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal handlers
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => modal.remove());
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    // Manual barcode search
    const input = modal.querySelector('#manual-barcode');
    const searchBtn = modal.querySelector('#search-barcode-btn');
    
    const doSearch = async () => {
      const barcode = input.value.trim();
      if (barcode) {
        await this.searchByBarcode(barcode);
        modal.remove();
      }
    };
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') doSearch();
    });
    
    searchBtn.addEventListener('click', doSearch);
    input.focus();
  }

  async loadProducts() {
    try {
      this.products = await this.services.product.getAll();
      this.renderProducts(this.products);
    } catch (error) {
      console.error('Error loading products:', error);
      this.showError('Error al cargar productos');
    }
  }

  renderProducts(products) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    
    const formatDate = (dateStr) => {
      if (!dateStr) return 'Sin fecha';
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };
    
    const getStockStatus = (stock) => {
      if (!stock || stock <= 0) return 'no-stock';
      if (stock <= 1) return 'low-stock';
      return 'in-stock';
    };
    
    grid.innerHTML = products.map(product => {
      const stockStatus = getStockStatus(product.stock_calculado ?? product.stock ?? 0);
      const proximoVenc = product.proximo_vencimiento 
        ? formatDate(product.proximo_vencimiento) 
        : 'Sin lotes';
      const stockValue = product.stock_calculado ?? product.stock ?? 0;
      
      return `
        <div class="product-card ${stockStatus}" data-id="${product.id}" data-stock="${stockValue}">
          <div class="product-name">${product.nombre}</div>
          <div class="product-info">
            <div class="product-stock">Stock: ${stockValue} unidades</div>
            <div class="product-expiry">Vence: ${proximoVenc}</div>
          </div>
          <div class="product-price">${Number(product.precio).toFixed(2)}</div>
          ${stockValue <= 1 ? '<div class="stock-warning">⚠️ Stock bajo</div>' : ''}
        </div>
      `;
    }).join('');
  }

  bindEvents() {
    // Product search
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = this.products.filter(p => 
          p.nombre.toLowerCase().includes(query) || 
          (p.codigo && p.codigo.toLowerCase().includes(query))
        );
        this.renderProducts(filtered);
      });
      
      // Barcode scanner support - hardware scanners type fast and end with Enter
      let barcodeBuffer = '';
      let lastKeyTime = 0;
      searchInput.addEventListener('keydown', async (e) => {
        const now = Date.now();
        // If more than 50ms between keystrokes, reset buffer (not a scanner)
        if (now - lastKeyTime > 50) {
          barcodeBuffer = '';
        }
        lastKeyTime = now;
        
        if (e.key === 'Enter' && barcodeBuffer.length > 0) {
          e.preventDefault();
          await this.searchByBarcode(barcodeBuffer);
          barcodeBuffer = '';
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          barcodeBuffer += e.key;
        }
      });
    }

    // Barcode scanner button
    const barcodeBtn = document.getElementById('barcode-btn');
    if (barcodeBtn) {
      barcodeBtn.addEventListener('click', () => this.openBarcodeScanner());
    }

    // Product click - add to cart
    const productsGrid = document.getElementById('products-grid');
    if (productsGrid) {
      productsGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.product-card');
        if (card) {
          const productId = parseInt(card.dataset.id);
          this.addToCart(productId);
        }
      });
    }

    // Clear cart
    const clearCartBtn = document.getElementById('clear-cart');
    if (clearCartBtn) {
      clearCartBtn.addEventListener('click', () => this.clearCart());
    }

    // Process sale
    const processSaleBtn = document.getElementById('process-sale');
    if (processSaleBtn) {
      processSaleBtn.addEventListener('click', () => this.processSale());
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }
  }

  addToCart(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;
    
    const stock = product.stock_calculado ?? product.stock ?? 0;
    
    // Validate stock > 1
    if (stock <= 0) {
      this.showError('Producto sin stock disponible');
      return;
    }
    
    if (stock <= 1) {
      this.showError('Stock insuficiente para venta (mínimo 2 unidades)');
      return;
    }
    
    // Validate has valid lot (not expired)
    if (!product.proximo_vencimiento && !product.cantidad_lotes) {
      this.showError('Producto sin lotes vigentes');
      return;
    }

    const existing = this.cart.find(item => item.product.id === productId);
    if (existing) {
      // Check if adding more would exceed available stock
      if (existing.quantity >= stock) {
        this.showError('No hay suficiente stock disponible');
        return;
      }
      existing.quantity++;
    } else {
      this.cart.push({ product, quantity: 1 });
    }
    this.renderCart();
  }

  removeFromCart(productId) {
    this.cart = this.cart.filter(item => item.product.id !== productId);
    this.renderCart();
  }

  updateQuantity(productId, quantity) {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }
    const item = this.cart.find(item => item.product.id === productId);
    if (item) {
      item.quantity = quantity;
    }
    this.renderCart();
  }

  renderCart() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    
    if (!cartItems || !cartTotal) return;

    if (this.cart.length === 0) {
      cartItems.innerHTML = '<p class="empty-cart">El carrito está vacío</p>';
      cartTotal.textContent = '$0.00';
      return;
    }

    let total = 0;
    cartItems.innerHTML = this.cart.map(item => {
      const subtotal = item.product.precio * item.quantity;
      total += subtotal;
      return `
        <div class="cart-item" data-id="${item.product.id}">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.product.nombre}</div>
            <div class="cart-item-price">$${Number(item.product.precio).toFixed(2)} x ${item.quantity}</div>
          </div>
          <div class="cart-item-actions">
            <button class="qty-btn minus" data-id="${item.product.id}">-</button>
            <span class="qty">${item.quantity}</span>
            <button class="qty-btn plus" data-id="${item.product.id}">+</button>
            <button class="remove-btn" data-id="${item.product.id}">×</button>
          </div>
          <div class="cart-item-subtotal">$${subtotal.toFixed(2)}</div>
        </div>
      `;
    }).join('');

    cartTotal.textContent = `$${total.toFixed(2)}`;

    // Bind cart events
    cartItems.querySelectorAll('.minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        const item = this.cart.find(i => i.product.id === id);
        if (item) this.updateQuantity(id, item.quantity - 1);
      });
    });

    cartItems.querySelectorAll('.plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        const item = this.cart.find(i => i.product.id === id);
        if (item) this.updateQuantity(id, item.quantity + 1);
      });
    });

    cartItems.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        this.removeFromCart(id);
      });
    });
  }

  clearCart() {
    this.cart = [];
    this.renderCart();
  }

  async processSale() {
    if (this.cart.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    const total = this.cart.reduce((sum, item) => sum + (item.product.precio * item.quantity), 0);
    
    // Show payment method selection
    const paymentMethods = [
      { id: 'efectivo', label: 'Efectivo' },
      { id: 'debito', label: 'Tarjeta Débito' },
      { id: 'credito', label: 'Tarjeta Crédito' },
      { id: 'transferencia', label: 'Transferencia' },
      { id: 'cuenta', label: 'Cuenta Corriente' }
    ];
    
    // Create modal for payment selection
    const modal = document.createElement('div');
    modal.className = 'payment-modal';
    modal.innerHTML = `
      <div class="payment-modal-content">
        <h3>Seleccionar Método de Pago</h3>
        <div class="payment-total">Total: ${total.toFixed(2)}</div>
        <div class="payment-buttons">
          ${paymentMethods.map(pm => `<button class="payment-btn" data-method="${pm.id}">${pm.label}</button>`).join('')}
        </div>
        <button class="cancel-btn">Cancelar</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle payment button clicks
    modal.querySelectorAll('.payment-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const metodoPago = e.target.dataset.method;
        modal.remove();
        await this.processSaleWithMethod(metodoPago, total);
      });
    });
    
    // Handle cancel
    modal.querySelector('.cancel-btn').addEventListener('click', () => {
      modal.remove();
    });
    
    // Add styles
    if (!document.getElementById('payment-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'payment-modal-styles';
      style.textContent = `
        .payment-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .payment-modal-content {
          background: white;
          padding: 30px;
          border-radius: 10px;
          text-align: center;
          min-width: 300px;
        }
        .payment-modal-content h3 {
          margin-bottom: 20px;
          color: #333;
        }
        .payment-total {
          font-size: 24px;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 20px;
        }
        .payment-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 20px;
        }
        .payment-btn {
          padding: 15px 20px;
          font-size: 14px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          background: #667eea;
          color: white;
          transition: background 0.3s;
        }
        .payment-btn:hover {
          background: #5568d3;
        }
        .cancel-btn {
          padding: 10px 20px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 5px;
          cursor: pointer;
        }
        .recent-sale-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
          font-size: 12px;
        }
        .recent-sale-item .sale-id {
          color: #667eea;
          font-weight: bold;
        }
        .recent-sale-item .sale-method {
          color: #6c757d;
          font-size: 10px;
        }
      `;
      document.head.appendChild(style);
    }
  }

  async processSaleWithMethod(metodoPago, total) {
    try {
      const sale = {
        items: this.cart.map(item => ({
          producto_id: item.product.id,
          cantidad: item.quantity,
          precio_unitario: item.product.precio
        })),
        metodo_pago: metodoPago,
        cliente_id: null
      };

      await this.services.sale.create(sale);
      alert('Venta procesada correctamente');
      this.clearCart();
      await this.loadProducts();
    } catch (error) {
      console.error('Error processing sale:', error);
      alert('Error al procesar la venta: ' + error.message);
    }
  }

  async loadUserInfo() {
    const user = this.services.auth.getUser();
    const userName = document.getElementById('user-name');
    if (userName && user) {
      userName.textContent = user.username || user.name || 'Usuario';
    }
  }

  async loadQuickInfo() {
    const quickInfo = document.getElementById('quick-info');
    const recentSalesDiv = document.getElementById('recent-sales');
    if (!quickInfo) return;

    try {
      const [products, sales] = await Promise.all([
        this.services.product.getAll(),
        this.services.sale.getTodaySales()
      ]);
      
      const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
      
      quickInfo.innerHTML = `
        <div class="info-item">
          <span class="label">Productos:</span>
          <span class="value">${products.length}</span>
        </div>
        <div class="info-item">
          <span class="label">Ventas hoy:</span>
          <span class="value">${sales.length}</span>
        </div>
        <div class="info-item">
          <span class="label">Total hoy:</span>
          <span class="value">${totalSales.toFixed(2)}</span>
        </div>
      `;
      
      // Load recent sales
      if (recentSalesDiv) {
        if (sales.length === 0) {
          recentSalesDiv.innerHTML = '<p>No hay ventas hoy</p>';
        } else {
          recentSalesDiv.innerHTML = sales.slice(0, 5).map(sale => `
            <div class="recent-sale-item">
              <span class="sale-id">#${sale.id}</span>
              <span class="sale-total">${(sale.total || 0).toFixed(2)}</span>
              <span class="sale-method">${sale.metodo_pago || 'efectivo'}</span>
            </div>
          `).join('');
        }
      }
    } catch (error) {
      console.error('Error loading quick info:', error);
      if (quickInfo) {
        quickInfo.innerHTML = '<p>Error al cargar información</p>';
      }
    }
  }

  logout() {
    this.services.auth.logout();
    window.Router.navigate('/login');
  }

  showError(message) {
    alert(message);
  }
}

export default DashboardPage;
