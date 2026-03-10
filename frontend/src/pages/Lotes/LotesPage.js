/**
 * Lotes Page - Gestión de Lotes de Productos
 */

import Header from '../../components/Header/Header.js';

export class LotesPage {
  constructor(container, services) {
    this.container = container;
    this.services = services;
    this.lotes = [];
    this.header = new Header();
  }

  async render() {
    this.container.innerHTML = `
      <div class="page-container">
        ${this.header.render('/lotes')}
        <header class="page-header">
          <h1>Gestión de Lotes</h1>
          <div class="page-actions">
            <button id="add-lote-btn" class="btn btn-primary">+ Nuevo Lote</button>
            <button onclick="window.Router.navigate('/')" class="btn btn-secondary">← Volver al Dashboard</button>
          </div>
        </header>
        
        <div class="page-content">
          <div class="filters-bar">
            <select id="product-filter" class="form-select">
              <option value="">Todos los productos</option>
            </select>
            <select id="estado-filter" class="form-select">
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="descartado">Descartado</option>
            </select>
            <button id="filter-lotes-btn" class="btn btn-primary">Filtrar</button>
          </div>
          
          <div class="summary-cards">
            <div class="summary-card">
              <h4>Total Lotes</h4>
              <p class="amount" id="total-lotes">0</p>
            </div>
            <div class="summary-card">
              <h4>Lotes Activos</h4>
              <p class="amount" id="lotes-activos">0</p>
            </div>
            <div class="summary-card">
              <h4>Stock Total</h4>
              <p class="amount" id="stock-total">0</p>
            </div>
          </div>
          
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Producto</th>
                <th>Número Lote</th>
                <th>Fecha Vencimiento</th>
                <th>Cant. Inicial</th>
                <th>Cant. Actual</th>
                <th>Costo Unit.</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="lotes-tbody">
              <tr><td colspan="9">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Create Lote Modal -->
      <div id="lote-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="modal-title">Nuevo Lote</h3>
            <button class="modal-close" onclick="document.getElementById('lote-modal').style.display='none'">&times;</button>
          </div>
          <form id="lote-form" class="modal-body">
            <input type="hidden" id="lote-id" />
            <div class="form-group">
              <label for="lote-producto">Producto:</label>
              <input type="text" id="lote-producto" list="lote-productos-list" required class="form-input" placeholder="Buscar producto..." autocomplete="off" />
              <datalist id="lote-productos-list"></datalist>
            </div>
            <div class="form-group">
              <label for="lote-numero">Número de Lote:</label>
              <input type="text" id="lote-numero" required class="form-input" />
            </div>
            <div class="form-group">
              <label for="lote-vencimiento">Fecha de Vencimiento:</label>
              <input type="date" id="lote-vencimiento" class="form-input" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="lote-cantidad">Cantidad Inicial:</label>
                <input type="number" id="lote-cantidad" required class="form-input" min="1" />
              </div>
              <div class="form-group">
                <label for="lote-costo">Costo Unitario:</label>
                <input type="number" id="lote-costo" step="0.01" class="form-input" />
              </div>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" id="lote-activo" checked /> Activo
              </label>
            </div>
            <div class="modal-actions">
              <button type="submit" class="btn btn-primary">Guardar</button>
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('lote-modal').style.display='none'">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    `;

    await this.loadLotes();
    await this.loadProducts();
    this.bindEvents();
    this.header.attachEvents();
  }

  async loadLotes(productoId = null, estado = null) {
    try {
      let lotes;
      if (productoId || estado) {
        const params = new URLSearchParams();
        if (productoId) params.append('producto_id', productoId);
        if (estado) params.append('estado', estado);
        lotes = await this.services.product.apiClient.get(`/lotes?${params}`);
      } else {
        lotes = await this.services.product.apiClient.get('/lotes');
      }
      this.lotes = lotes;
      this.renderLotes();
      this.updateSummary();
    } catch (error) {
      console.error('Error loading lotes:', error);
    }
  }

  async loadProducts() {
    try {
      const products = await this.services.product.getAll();
      
      const input = document.getElementById('lote-producto');
      const datalist = document.getElementById('lote-productos-list');
      const filter = document.getElementById('product-filter');
      
      if (datalist) {
        datalist.innerHTML = '';
        products.forEach(p => {
          const option = document.createElement('option');
          option.value = p.id;
          option.textContent = `${p.codigo} - ${p.nombre}`;
          datalist.appendChild(option);
        });
        
        // Auto-generate lot number when product is selected
        input.addEventListener('input', async (e) => {
          const productoId = e.target.value;
          if (productoId && !isNaN(parseInt(productoId))) {
            await this.generateLoteNumber(productoId);
          }
        });
      }
      
      if (filter) {
        filter.innerHTML = '<option value="">Todos los productos</option>';
        products.forEach(p => {
          filter.innerHTML += `<option value="${p.id}">${p.codigo} - ${p.nombre}</option>`;
        });
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }
  
  async generateLoteNumber(productoId) {
    try {
      const response = await this.services.product.apiClient.get(`/lotes/suggest?producto_id=${productoId}`);
      const data = response;
      
      const numeroLote = document.getElementById('lote-numero');
      const fechaVencimiento = document.getElementById('lote-vencimiento');
      
      if (numeroLote && data.suggested_lote) {
        numeroLote.value = data.suggested_lote;
      }
      if (fechaVencimiento && data.suggested_date) {
        fechaVencimiento.value = data.suggested_date;
      }
    } catch (error) {
      console.error('Error generating lot number:', error);
    }
  }

  renderLotes() {
    const tbody = document.getElementById('lotes-tbody');
    if (!tbody) return;
    
    if (!this.lotes.length) {
      tbody.innerHTML = '<tr><td colspan="9">No hay lotes</td></tr>';
      return;
    }
    
    tbody.innerHTML = this.lotes.map(l => `
      <tr>
        <td>${l.id}</td>
        <td>${l.producto_nombre || 'Producto #' + l.producto_id}</td>
        <td>${l.numero_lote || '-'}</td>
        <td>${l.fecha_vencimiento || '-'}</td>
        <td>${l.cantidad_inicial}</td>
        <td>${l.cantidad_actual}</td>
        <td>$${Number(l.costo_unitario || 0).toFixed(2)}</td>
        <td>
          <span class="badge badge-${l.estado === 'activo' ? 'success' : 'secondary'}">
            ${l.estado === 'activo' ? 'Activo' : 'Descartado'}
          </span>
        </td>
        <td>
          <button class="btn-icon" onclick="window.LotesPageInstance.editLote(${l.id})" title="Editar">✏️</button>
          ${l.estado === 'activo' ? `<button class="btn-icon" onclick="window.LotesPageInstance.discardLote(${l.id})" title="Descartar">🗑️</button>` : ''}
        </td>
      </tr>
    `).join('');
  }

  updateSummary() {
    const total = this.lotes.length;
    const activos = this.lotes.filter(l => l.estado === 'activo').length;
    const stock = this.lotes
      .filter(l => l.estado === 'activo')
      .reduce((sum, l) => sum + (l.cantidad_actual || 0), 0);
    
    document.getElementById('total-lotes').textContent = total;
    document.getElementById('lotes-activos').textContent = activos;
    document.getElementById('stock-total').textContent = stock;
  }

  showModal(lote = null) {
    const modal = document.getElementById('lote-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('lote-form');
    
    form.reset();
    
    if (lote) {
      title.textContent = 'Editar Lote';
      document.getElementById('lote-id').value = lote.id;
      document.getElementById('lote-producto').value = lote.producto_id;
      document.getElementById('lote-numero').value = lote.numero_lote || '';
      document.getElementById('lote-vencimiento').value = lote.fecha_vencimiento || '';
      document.getElementById('lote-cantidad').value = lote.cantidad_inicial;
      document.getElementById('lote-costo').value = lote.costo_unitario || '';
      document.getElementById('lote-activo').checked = lote.estado === 'activo';
    } else {
      title.textContent = 'Nuevo Lote';
      document.getElementById('lote-id').value = '';
    }
    
    modal.style.display = 'flex';
  }

  editLote(id) {
    const lote = this.lotes.find(l => l.id === id);
    if (lote) {
      this.showModal(lote);
    }
  }

  async discardLote(id) {
    if (!confirm('¿Está seguro de descartar este lote? Ya no se podrá usar para ventas.')) return;
    
    try {
      await this.services.product.apiClient.put(`/lotes/${id}`, { estado: 'descartado' });
      await this.loadLotes();
    } catch (error) {
      alert('Error al descartar lote: ' + error.message);
    }
  }

  async saveLote(e) {
    e.preventDefault();
    
    const productoInput = document.getElementById('lote-producto');
    const productoId = parseInt(productoInput.value);
    
    // Validate that a valid product was selected
    if (!productoInput.value || isNaN(productoId)) {
      alert('Por favor seleccione un producto válido de la lista');
      return;
    }
    
    const id = document.getElementById('lote-id').value;
    const loteData = {
      producto_id: productoId,
      numero_lote: document.getElementById('lote-numero').value,
      fecha_vencimiento: document.getElementById('lote-vencimiento').value || null,
      cantidad_inicial: parseInt(document.getElementById('lote-cantidad').value),
      cantidad_actual: parseInt(document.getElementById('lote-cantidad').value),
      costo_unitario: parseFloat(document.getElementById('lote-costo').value) || 0,
      estado: document.getElementById('lote-activo').checked ? 'activo' : 'descartado'
    };
    
    try {
      if (id) {
        await this.services.product.apiClient.put(`/lotes/${id}`, loteData);
      } else {
        await this.services.product.apiClient.post('/lotes', loteData);
      }
      
      document.getElementById('lote-modal').style.display = 'none';
      await this.loadLotes();
    } catch (error) {
      alert('Error al guardar lote: ' + error.message);
    }
  }

  bindEvents() {
    const filterBtn = document.getElementById('filter-lotes-btn');
    if (filterBtn) {
      filterBtn.addEventListener('click', () => {
        const productoId = document.getElementById('product-filter').value;
        const estado = document.getElementById('estado-filter').value;
        this.loadLotes(productoId || null, estado || null);
      });
    }

    const addBtn = document.getElementById('add-lote-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showModal());
    }

    const form = document.getElementById('lote-form');
    if (form) {
      form.addEventListener('submit', (e) => this.saveLote(e));
    }

    window.LotesPageInstance = this;
  }
}
