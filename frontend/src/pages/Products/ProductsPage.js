/**
 * Products Page - Gestión de Productos
 */

import Header from '../../components/Header/Header.js';

export class ProductsPage {
  constructor(container, services) {
    this.container = container;
    this.services = services;
    this.products = [];
    this.categories = [];
    this.editingProduct = null;
    this.header = new Header();
  }

  async render() {
    this.container.innerHTML = `
      <div class="page-container">
        ${this.header.render('/products')}
        <header class="page-header">
          <h1>Gestión de Productos</h1>
          <div class="page-actions">
            <button id="add-product-btn" class="btn btn-primary">+ Nuevo Producto</button>
            <button onclick="window.Router.navigate('/')" class="btn btn-secondary">← Volver al Dashboard</button>
          </div>
        </header>
        
        <div class="page-content">
          <div class="filters-bar">
            <input type="text" id="product-search" placeholder="Buscar productos..." class="form-input" />
            <select id="category-filter" class="form-select">
              <option value="">Todas las categorías</option>
            </select>
          </div>
          
          <div id="products-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Cód. Barras</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="products-tbody">
                <tr><td colspan="7">Cargando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <!-- Product Modal -->
      <div id="product-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="modal-title">Nuevo Producto</h3>
            <button class="modal-close" onclick="document.getElementById('product-modal').style.display='none'">&times;</button>
          </div>
          <form id="product-form" class="modal-body">
            <input type="hidden" id="product-id" />
            <div class="form-group">
              <label for="product-categoria">Categoría:</label>
              <input type="text" id="product-categoria" class="form-input" list="categorias-list" />
              <datalist id="categorias-list"></datalist>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="product-codigo">Código:</label>
                <input type="text" id="product-codigo" class="form-input" placeholder="Se genera automáticamente" readonly style="background-color: #f5f5f5;" />
              </div>
            </div>
            <div class="form-group">
              <label for="product-nombre">Nombre:</label>
              <input type="text" id="product-nombre" class="form-input" required />
            </div>
            <div class="form-group">
              <label for="product-codigo-barras">Código de Barras:</label>
              <input type="text" id="product-codigo-barras" class="form-input" />
            </div>
            <div class="form-group">
              <label for="product-descripcion">Descripción:</label>
              <textarea id="product-descripcion" class="form-input"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="product-precio">Precio:</label>
                <input type="number" id="product-precio" step="0.01" required class="form-input" />
              </div>
              <div class="form-group">
                <label for="product-stock">Stock:</label>
                <input type="number" id="product-stock" class="form-input" value="0" />
              </div>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" id="product-activo" checked /> Activo
              </label>
            </div>
            <div class="modal-actions">
              <button type="submit" class="btn btn-primary">Guardar</button>
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('product-modal').style.display='none'">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    `;

    await this.loadProducts();
    await this.loadCategories();
    this.bindEvents();
    this.header.attachEvents();
  }

  async loadProducts() {
    try {
      this.products = await this.services.product.getAll();
      this.renderProducts();
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  async loadCategories() {
    try {
      // Extract unique categories from products
      const categories = [...new Set(this.products.map(p => p.categoria).filter(Boolean))];
      this.categories = categories.sort();
      
      const select = document.getElementById('category-filter');
      const datalist = document.getElementById('categorias-list');
      
      let options = '<option value="">Todas las categorías</option>';
      let datalistOptions = '';
      
      this.categories.forEach(cat => {
        options += `<option value="${cat}">${cat}</option>`;
        datalistOptions += `<option value="${cat}">`;
      });
      
      select.innerHTML = options;
      datalist.innerHTML = datalistOptions;
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  renderProducts(filteredProducts = null) {
    const products = filteredProducts || this.products;
    const tbody = document.getElementById('products-tbody');
    
    if (!products.length) {
      tbody.innerHTML = '<tr><td colspan="7">No hay productos</td></tr>';
      return;
    }
    
    tbody.innerHTML = products.map(p => `
      <tr>
        <td>${p.codigo || '-'}</td>
        <td>${p.nombre}</td>
        <td>${p.categoria || '-'}</td>
        <td>${Number(p.precio).toFixed(2)}</td>
        <td>${p.stock_calculado ?? p.stock ?? 0}</td>
        <td>${p.codigo_barras || '-'}</td>
        <td>
          <button class="btn-icon" onclick="window.ProductsPageInstance.editProduct(${p.id})" title="Editar">✏️</button>
          <button class="btn-icon" onclick="window.ProductsPageInstance.deleteProduct(${p.id})" title="Eliminar">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  bindEvents() {
    // Search
    const searchInput = document.getElementById('product-search');
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = this.products.filter(p => 
        p.nombre.toLowerCase().includes(query) ||
        (p.codigo && p.codigo.toLowerCase().includes(query)) ||
        (p.codigo_barras && p.codigo_barras.includes(query))
      );
      this.renderProducts(filtered);
    });

    // Auto-generate code based on category selection
    const categoriaInput = document.getElementById('product-categoria');
    const codigoInput = document.getElementById('product-codigo');
    
    categoriaInput.addEventListener('change', (e) => {
      const selectedCategory = e.target.value.trim();
      
      if (selectedCategory && this.categories.includes(selectedCategory)) {
        // Get category abbreviation (first 4 letters or full name if shorter)
        let abbrev = selectedCategory.substring(0, 4).toUpperCase();
        
        // Check if category already has abbreviation prefix (like "BEB - Bebidas")
        const abbrevMatch = selectedCategory.match(/^([A-Z]{2,4})\s*-/);
        if (abbrevMatch) {
          abbrev = abbrevMatch[1];
        }
        
        // Find existing products with this category prefix
        const existingCodes = this.products
          .filter(p => p.categoria === selectedCategory && p.codigo && p.codigo.startsWith(abbrev + '-'))
          .map(p => {
            const match = p.codigo.match(/-(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter(n => !isNaN(n) && n > 0);
        
        let nextNumber = 1;
        if (existingCodes.length > 0) {
          nextNumber = Math.max(...existingCodes) + 1;
        }
        
        // Format: ABBREV-XXX (e.g., OTRO-001, VERD-001)
        const paddedNumber = nextNumber.toString().padStart(3, '0');
        codigoInput.value = `${abbrev}-${paddedNumber}`;
      }
    });

    // Validate barcode when entered
    const barcodeInput = document.getElementById('product-codigo-barras');
    barcodeInput.addEventListener('change', async (e) => {
      const barcode = e.target.value.trim();
      
      if (barcode) {
        // Check if barcode already exists
        const existingProduct = this.products.find(p => p.codigo_barras === barcode);
        
        if (existingProduct) {
          alert(`El código de barras ya existe para el producto: ${existingProduct.nombre} (Código: ${existingProduct.codigo})`);
          e.target.value = '';
          e.target.focus();
        }
      }
    });

    // Category filter
    const categoryFilter = document.getElementById('category-filter');
    categoryFilter.addEventListener('change', (e) => {
      const category = e.target.value;
      if (!category) {
        this.renderProducts();
      } else {
        const filtered = this.products.filter(p => p.categoria === category);
        this.renderProducts(filtered);
      }
    });

    // Add product button
    const addBtn = document.getElementById('add-product-btn');
    addBtn.addEventListener('click', () => this.showModal());

    // Form submit
    const form = document.getElementById('product-form');
    form.addEventListener('submit', (e) => this.saveProduct(e));

    // Make instance available globally for inline handlers
    window.ProductsPageInstance = this;
  }

  showModal(product = null) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('product-form');
    const codigoInput = document.getElementById('product-codigo');
    const categoriaInput = document.getElementById('product-categoria');
    
    form.reset();
    codigoInput.readOnly = false;
    codigoInput.style.backgroundColor = '#fff';
    codigoInput.placeholder = 'Se genera automáticamente';
    codigoInput.value = '';
    
    if (product) {
      title.textContent = 'Editar Producto';
      document.getElementById('product-id').value = product.id;
      codigoInput.value = product.codigo || '';
      codigoInput.readOnly = true; // Code cannot be changed in edit mode
      codigoInput.style.backgroundColor = '#f5f5f5';
      document.getElementById('product-codigo-barras').value = product.codigo_barras || '';
      document.getElementById('product-nombre').value = product.nombre;
      document.getElementById('product-descripcion').value = product.descripcion || '';
      document.getElementById('product-precio').value = product.precio;
      document.getElementById('product-stock').value = product.stock_calculado ?? product.stock ?? 0;
      document.getElementById('product-categoria').value = product.categoria || '';
      document.getElementById('product-activo').checked = product.activo !== 0;
    } else {
      title.textContent = 'Nuevo Producto';
      document.getElementById('product-id').value = '';
      document.getElementById('product-nombre').value = '';
      document.getElementById('product-codigo-barras').value = '';
      document.getElementById('product-descripcion').value = '';
      document.getElementById('product-precio').value = '';
      document.getElementById('product-stock').value = '0';
      document.getElementById('product-categoria').value = '';
      document.getElementById('product-activo').checked = true;
    }
    
    modal.style.display = 'flex';
    
    // Trigger category change to auto-generate code if category is selected
    if (!product && categoriaInput.value && this.categories.includes(categoriaInput.value)) {
      categoriaInput.dispatchEvent(new Event('change'));
    }
  }

  editProduct(id) {
    const product = this.products.find(p => p.id === id);
    if (product) {
      this.showModal(product);
    }
  }

  async deleteProduct(id) {
    if (!confirm('¿Está seguro de eliminar este producto?')) return;
    
    try {
      await this.services.product.delete(id);
      await this.loadProducts();
    } catch (error) {
      alert('Error al eliminar producto: ' + error.message);
    }
  }

  async saveProduct(e) {
    e.preventDefault();
    
    const id = document.getElementById('product-id').value;
    const codigo = document.getElementById('product-codigo').value.trim();
    const nombre = document.getElementById('product-nombre').value.trim();
    const categoria = document.getElementById('product-categoria').value.trim();
    
    // Validate required fields
    if (!nombre) {
      alert('Por favor ingrese el nombre del producto');
      return;
    }
    
    // If no code is provided, auto-generate one based on category
    let finalCodigo = codigo;
    if (!finalCodigo && categoria) {
      // Get category abbreviation
      let abbrev = categoria.substring(0, 4).toUpperCase();
      const abbrevMatch = categoria.match(/^([A-Z]{2,4})\s*-/);
      if (abbrevMatch) {
        abbrev = abbrevMatch[1];
      }
      
      // Find existing products with this category prefix
      const existingCodes = this.products
        .filter(p => p.categoria === categoria && p.codigo && p.codigo.startsWith(abbrev + '-'))
        .map(p => {
          const match = p.codigo.match(/-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => !isNaN(n) && n > 0);
      
      let nextNumber = 1;
      if (existingCodes.length > 0) {
        nextNumber = Math.max(...existingCodes) + 1;
      }
      
      finalCodigo = `${abbrev}-${nextNumber.toString().padStart(3, '0')}`;
    }
    
    const productData = {
      codigo: finalCodigo,
      codigo_barras: document.getElementById('product-codigo-barras').value,
      nombre: nombre,
      descripcion: document.getElementById('product-descripcion').value,
      precio: parseFloat(document.getElementById('product-precio').value) || 0,
      stock: parseInt(document.getElementById('product-stock').value) || 0,
      categoria: categoria,
      activo: document.getElementById('product-activo').checked ? 1 : 0
    };
    
    try {
      if (id) {
        await this.services.product.update(id, productData);
      } else {
        await this.services.product.create(productData);
      }
      
      document.getElementById('product-modal').style.display = 'none';
      await this.loadProducts();
      await this.loadCategories();
    } catch (error) {
      alert('Error al guardar producto: ' + error.message);
    }
  }
}
