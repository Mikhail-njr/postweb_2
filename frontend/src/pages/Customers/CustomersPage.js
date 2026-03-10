/**
 * Customers Page - Gestión de Clientes y Cuenta Corriente
 */

import Header from '../../components/Header/Header.js';

export class CustomersPage {
  constructor(container, services) {
    this.container = container;
    this.services = services;
    this.customers = [];
    this.deudas = [];
    this.customerDebts = [];
    this.header = new Header();
  }

  async render() {
    this.container.innerHTML = `
      <div class="page-container">
        ${this.header.render('/customers')}
        <header class="page-header">
          <h1>Clientes - Cuenta Corriente</h1>
          <div class="page-actions">
            <button id="add-customer-btn" class="btn btn-primary">+ Nuevo Cliente</button>
            <button onclick="window.Router.navigate('/')" class="btn btn-secondary">← Volver al Dashboard</button>
          </div>
        </header>
        
        <div class="page-content">
          <div class="tabs">
            <button class="tab-btn active" data-tab="list">Lista de Clientes</button>
            <button class="tab-btn" data-tab="debts">Cuenta Corriente</button>
          </div>
          
          <div id="tab-list" class="tab-content">
            <div class="filters-bar">
              <input type="text" id="customer-search" placeholder="Buscar clientes..." class="form-input" />
            </div>
            
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Dirección</th>
                  <th>Saldo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="customers-tbody">
                <tr><td colspan="6">Cargando...</td></tr>
              </tbody>
            </table>
          </div>
          
          <div id="tab-debts" class="tab-content" style="display: none;">
            <h3>Resumen de Cuenta Corriente</h3>
            <div id="debts-summary">
              <p>Cargando...</p>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                  <th>Saldo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody id="debts-tbody">
                <tr><td colspan="6">Cargando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <!-- Customer Modal -->
      <div id="customer-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="modal-title">Nuevo Cliente</h3>
            <button class="modal-close" onclick="document.getElementById('customer-modal').style.display='none'">&times;</button>
          </div>
          <form id="customer-form" class="modal-body">
            <input type="hidden" id="customer-id" />
            <div class="form-group">
              <label for="customer-nombre">Nombre:</label>
              <input type="text" id="customer-nombre" required class="form-input" />
            </div>
            <div class="form-group">
              <label for="customer-telefono">Teléfono:</label>
              <input type="text" id="customer-telefono" class="form-input" />
            </div>
            <div class="form-group">
              <label for="customer-direccion">Dirección:</label>
              <input type="text" id="customer-direccion" class="form-input" />
            </div>
            <div class="form-group">
              <label for="customer-documento">Documento:</label>
              <input type="text" id="customer-documento" class="form-input" />
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" id="customer-activo" checked /> Activo
              </label>
            </div>
            <div class="modal-actions">
              <button type="submit" class="btn btn-primary">Guardar</button>
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('customer-modal').style.display='none'">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
      
      <!-- Debt Detail Modal -->
      <div id="debt-detail-modal" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 1200px; max-height: 90vh; overflow-y: auto;">
          <div class="modal-header">
            <h3>💳 Deudas del Cliente</h3>
            <button class="modal-close" onclick="document.getElementById('debt-detail-modal').style.display='none'">&times;</button>
          </div>
          <div class="modal-body">
            <div id="debt-customer-info"></div>
            
            <div class="summary-cards" style="margin: 20px 0;">
              <div class="summary-card">
                <h4>Total Pendiente</h4>
                <p class="amount" id="detail-total-pending" style="color: red;">$0.00</p>
              </div>
              <div class="summary-card">
                <h4>Facturas Pendientes</h4>
                <p class="amount" id="detail-pending-count">0 de 0</p>
              </div>
              <div class="summary-card">
                <h4>Total Facturas</h4>
                <p class="amount" id="detail-total-count">0</p>
              </div>
            </div>
            
            <h4>Detalles por Factura</h4>
            
            <div class="filters-bar" style="margin: 15px 0;">
              <select id="filter-invoice" class="form-input" style="width: auto;">
                <option value="">📋 Todas las Facturas</option>
              </select>
              <select id="filter-status" class="form-input" style="width: auto;">
                <option value="">📊 Todos los Estados</option>
                <option value="pendiente">⏳ Pendientes</option>
                <option value="pagado">✅ Pagadas</option>
              </select>
              <button id="clear-debt-filters" class="btn btn-secondary">Limpiar Filtros</button>
            </div>
            
            <table class="data-table" id="debt-detail-table">
              <thead>
                <tr>
                  <th>FACTURA</th>
                  <th>FECHA</th>
                  <th>PRODUCTO</th>
                  <th>CANTIDAD</th>
                  <th>PRECIO COMPRA</th>
                  <th>PRECIO ACTUAL</th>
                  <th>DIFERENCIA</th>
                  <th>PENDIENTE</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody id="debt-detail-tbody">
                <tr><td colspan="10">Cargando...</td></tr>
              </tbody>
            </table>
          </div>
          <div class="modal-actions" style="padding: 15px;">
            <button class="btn btn-secondary" onclick="document.getElementById('debt-detail-modal').style.display='none'">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    await this.loadCustomers();
    await this.loadDebts();
    this.bindEvents();
    this.header.attachEvents();
  }

  async loadCustomers() {
    try {
      this.customers = await this.services.customer.getAll();
      this.renderCustomers();
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  }

  async loadDebts() {
    try {
      this.deudas = await this.services.debt.getAll();
      this.renderDebts(this.deudas);
    } catch (error) {
      console.error('Error loading debts:', error);
    }
  }

  renderCustomers() {
    const tbody = document.getElementById('customers-tbody');
    if (!tbody) return;
    
    if (!this.customers.length) {
      tbody.innerHTML = '<tr><td colspan="6">No hay clientes</td></tr>';
      return;
    }
    
    tbody.innerHTML = this.customers.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${c.nombre}</td>
        <td>${c.telefono || '-'}</td>
        <td>${c.direccion || '-'}</td>
        <td style="color: ${c.saldo > 0 ? 'red' : 'green'}">$${Number(c.saldo || 0).toFixed(2)}</td>
        <td>
          <button class="btn-icon" onclick="window.CustomersPageInstance.viewAccount(${c.id})" title="Ver Cuenta">📊</button>
          <button class="btn-icon" onclick="window.CustomersPageInstance.viewDebtDetails(${c.id})" title="Ver Detalle">👁️</button>
          <button class="btn-icon" onclick="window.CustomersPageInstance.editCustomer(${c.id})" title="Editar">✏️</button>
          <button class="btn-icon" onclick="window.CustomersPageInstance.deleteCustomer(${c.id})" title="Eliminar">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  renderDebts(debts) {
    const tbody = document.getElementById('debts-tbody');
    if (!tbody) return;
    
    if (!debts.length) {
      tbody.innerHTML = '<tr><td colspan="6">No hay movimientos</td></tr>';
      return;
    }
    
    tbody.innerHTML = debts.map(d => `
      <tr>
        <td>${d.created_at || d.fecha || '-'}</td>
        <td>${d.cliente_nombre || '-'}</td>
        <td>${d.tipo === 'compra' ? 'Compra' : 'Pago'}</td>
        <td style="color: ${d.tipo === 'compra' ? 'red' : 'green'}">$${Number(d.monto).toFixed(2)}</td>
        <td>$${Number(d.saldo).toFixed(2)}</td>
        <td>${d.estado === 'pendiente' ? '⏳ Pendiente' : '✅ Pagado'}</td>
      </tr>
    `).join('');
    
    // Update summary
    const totalPendiente = debts.filter(d => d.estado === 'pendiente').reduce((sum, d) => sum + Number(d.monto), 0);
    const summary = document.getElementById('debts-summary');
    if (summary) {
      summary.innerHTML = `
        <div class="summary-cards">
          <div class="summary-card">
            <h4>Total Pendiente</h4>
            <p class="amount" style="color: red;">$${totalPendiente.toFixed(2)}</p>
          </div>
          <div class="summary-card">
            <h4>Total Clientes</h4>
            <p class="amount">${this.customers.length}</p>
          </div>
        </div>
      `;
    }
  }

  async viewDebtDetails(customerId) {
    const modal = document.getElementById('debt-detail-modal');
    const tbody = document.getElementById('debt-detail-tbody');
    const infoDiv = document.getElementById('debt-customer-info');
    
    tbody.innerHTML = '<tr><td colspan="10">Cargando...</td></tr>';
    modal.style.display = 'flex';
    
    try {
      // Get customer info
      const customer = this.customers.find(c => c.id === customerId);
      if (customer) {
        infoDiv.innerHTML = `<p><strong>Cliente:</strong> ${customer.nombre} | <strong>Teléfono:</strong> ${customer.telefono || '-'}</p>`;
      }
      
      // Get debts with products
      const debts = await this.services.debt.getCustomerDebtDetails(customerId);
      this.customerDebts = debts;
      this.currentCustomerId = customerId;
      
      // Build flat list for table
      let allItems = [];
      let invoiceOptions = new Set();
      
      debts.forEach(debt => {
        const invoiceNum = `FAC-${debt.id}`;
        invoiceOptions.add(invoiceNum);
        
        const productos = typeof debt.productos === 'string' 
          ? JSON.parse(debt.productos) 
          : (debt.productos || []);
        
        productos.forEach(prod => {
          const precioCompra = Number(prod.precio_unitario || 0);
          const precioActual = Number(prod.precio_actual || precioCompra);
          const cantidad = Number(prod.cantidad || 1);
          const pendiente = prod.pagado ? 0 : (precioActual * cantidad);
          const diferencia = precioActual - precioCompra;
          
          allItems.push({
            deuda_id: debt.id,
            factura: invoiceNum,
            fecha: debt.created_at || debt.fecha,
            producto_id: prod.producto_id,
            producto_nombre: prod.nombre || 'Producto #' + prod.producto_id,
            cantidad: cantidad,
            precio_compra: precioCompra,
            precio_actual: precioActual,
            diferencia: diferencia,
            pendiente: pendiente,
            pagado: prod.pagado
          });
        });
      });
      
      // Populate invoice filter
      const invoiceSelect = document.getElementById('filter-invoice');
      invoiceSelect.innerHTML = '<option value="">📋 Todas las Facturas</option>';
      invoiceOptions.forEach(inv => {
        invoiceSelect.innerHTML += `<option value="${inv}">${inv}</option>`;
      });
      
      // Calculate summary
      const totalPendiente = allItems.filter(i => !i.pagado).reduce((sum, i) => sum + i.pendiente, 0);
      const pendingInvoices = new Set(allItems.filter(i => !i.pagado).map(i => i.factura));
      const totalInvoices = new Set(allItems.map(i => i.factura));
      
      document.getElementById('detail-total-pending').textContent = `$${totalPendiente.toFixed(2)}`;
      document.getElementById('detail-pending-count').textContent = `${pendingInvoices.size} de ${totalInvoices.size}`;
      document.getElementById('detail-total-count').textContent = totalInvoices.size;
      
      this.renderDebtDetailTable(allItems);
      
    } catch (error) {
      console.error('Error loading debt details:', error);
      tbody.innerHTML = `<tr><td colspan="10">Error: ${error.message}</td></tr>`;
    }
  }

  renderDebtDetailTable(items) {
    const tbody = document.getElementById('debt-detail-tbody');
    if (!tbody) return;
    
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="10">No hay productos</td></tr>';
      return;
    }
    
    // Group items by invoice
    const groupedItems = {};
    items.forEach(item => {
      if (!groupedItems[item.factura]) {
        groupedItems[item.factura] = {
          factura: item.factura,
          fecha: item.fecha,
          items: []
        };
      }
      groupedItems[item.factura].items.push(item);
    });
    
    let html = '';
    Object.values(groupedItems).forEach(group => {
      const firstItem = group.items[0];
      const rowSpan = group.items.length;
      
      group.items.forEach((item, index) => {
        const diferenciaSign = item.diferencia >= 0 ? '+' : '';
        const diferenciaColor = item.diferencia > 0 ? 'green' : (item.diferencia < 0 ? 'red' : 'black');
        
        html += `
          <tr>
            ${index === 0 ? `<td rowspan="${rowSpan}">${group.factura}</td>` : ''}
            ${index === 0 ? `<td rowspan="${rowSpan}">${this.formatDate(group.fecha)}</td>` : ''}
            <td>${item.producto_nombre}</td>
            <td>${item.cantidad}</td>
            <td>${item.precio_compra.toFixed(2)}</td>
            <td>${item.precio_actual.toFixed(2)}</td>
            <td style="color: ${diferenciaColor}">${diferenciaSign}${item.diferencia.toFixed(2)}</td>
            <td>${item.pendiente.toFixed(2)}</td>
            <td>${item.pagado ? '✅ Pagado' : '⏳ Pendiente'}</td>
            <td>
              ${!item.pagado 
                ? `<button class="btn btn-small btn-primary" onclick="window.CustomersPageInstance.payProduct(${item.deuda_id}, ${item.producto_id}, ${item.pendiente})">Pagar ${item.pendiente.toFixed(2)}</button>`
                : '<span style="color: green;">✓ Pagado</span>'
              }
            </td>
          </tr>
        `;
      });
    });
    
    tbody.innerHTML = html;
  }

  filterDebtDetails() {
    const invoiceFilter = document.getElementById('filter-invoice').value;
    const statusFilter = document.getElementById('filter-status').value;
    
    let items = [];
    this.customerDebts.forEach(debt => {
      const invoiceNum = `FAC-${debt.id}`;
      const productos = typeof debt.productos === 'string' 
        ? JSON.parse(debt.productos) 
        : (debt.productos || []);
      
      productos.forEach(prod => {
        const precioCompra = Number(prod.precio_unitario || 0);
        const precioActual = Number(prod.precio_actual || precioCompra);
        const cantidad = Number(prod.cantidad || 1);
        const pendiente = prod.pagado ? 0 : (precioActual * cantidad);
        const diferencia = precioActual - precioCompra;
        
        items.push({
          deuda_id: debt.id,
          factura: invoiceNum,
          fecha: debt.fecha,
          producto_id: prod.producto_id,
          producto_nombre: prod.nombre || 'Producto #' + prod.producto_id,
          cantidad: cantidad,
          precio_compra: precioCompra,
          precio_actual: precioActual,
          diferencia: diferencia,
          pendiente: pendiente,
          pagado: prod.pagado
        });
      });
    });
    
    // Apply filters
    if (invoiceFilter) {
      items = items.filter(i => i.factura === invoiceFilter);
    }
    
    if (statusFilter) {
      const isPaid = statusFilter === 'pagado';
      items = items.filter(i => i.pagado === isPaid);
    }
    
    this.renderDebtDetailTable(items);
  }

  async payProduct(debtId, productId, amount) {
    if (!confirm(`¿Confirmar pago de $${amount.toFixed(2)}?`)) return;
    
    try {
      await this.services.debt.payProduct(this.currentCustomerId, debtId, productId);
      alert('Pago registrado correctamente');
      // Refresh the detail view
      await this.viewDebtDetails(this.currentCustomerId);
    } catch (error) {
      alert('Error al registrar pago: ' + error.message);
    }
  }

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR');
  }

  bindEvents() {
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tab = btn.dataset.tab;
        document.getElementById('tab-list').style.display = tab === 'list' ? 'block' : 'none';
        document.getElementById('tab-debts').style.display = tab === 'debts' ? 'block' : 'none';
      });
    });

    // Search
    const searchInput = document.getElementById('customer-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = this.customers.filter(c => 
          c.nombre.toLowerCase().includes(query) ||
          (c.telefono && c.telefono.includes(query))
        );
        
        const tbody = document.getElementById('customers-tbody');
        if (!filtered.length) {
          tbody.innerHTML = '<tr><td colspan="6">No se encontraron clientes</td></tr>';
        } else {
          this.customers = filtered;
          this.renderCustomers();
        }
      });
    }

    // Add customer button
    const addBtn = document.getElementById('add-customer-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showModal());
    }

    // Form submit
    const form = document.getElementById('customer-form');
    if (form) {
      form.addEventListener('submit', (e) => this.saveCustomer(e));
    }
    
    // Debt detail filters
    const filterInvoice = document.getElementById('filter-invoice');
    const filterStatus = document.getElementById('filter-status');
    const clearFilters = document.getElementById('clear-debt-filters');
    
    if (filterInvoice) {
      filterInvoice.addEventListener('change', () => this.filterDebtDetails());
    }
    if (filterStatus) {
      filterStatus.addEventListener('change', () => this.filterDebtDetails());
    }
    if (clearFilters) {
      clearFilters.addEventListener('click', () => {
        filterInvoice.value = '';
        filterStatus.value = '';
        this.filterDebtDetails();
      });
    }

    // Make instance available globally
    window.CustomersPageInstance = this;
  }

  viewAccount(customerId) {
    // Switch to debts tab and filter by customer
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(b => b.classList.remove('active'));
    tabBtns[1].classList.add('active');
    document.getElementById('tab-list').style.display = 'none';
    document.getElementById('tab-debts').style.display = 'block';
  }

  editCustomer(id) {
    const customer = this.customers.find(c => c.id === id);
    if (customer) {
      this.showModal(customer);
    }
  }

  async deleteCustomer(id) {
    if (!confirm('¿Está seguro de eliminar este cliente?')) return;
    
    try {
      await this.services.customer.delete(id);
      await this.loadCustomers();
    } catch (error) {
      alert('Error al eliminar cliente: ' + error.message);
    }
  }

  async saveCustomer(e) {
    e.preventDefault();
    
    const id = document.getElementById('customer-id').value;
    const customerData = {
      nombre: document.getElementById('customer-nombre').value,
      telefono: document.getElementById('customer-telefono').value,
      direccion: document.getElementById('customer-direccion').value,
      documento: document.getElementById('customer-documento').value,
      activo: document.getElementById('customer-activo').checked ? 1 : 0
    };
    
    try {
      if (id) {
        await this.services.customer.update(id, customerData);
      } else {
        await this.services.customer.create(customerData);
      }
      
      document.getElementById('customer-modal').style.display = 'none';
      await this.loadCustomers();
    } catch (error) {
      alert('Error al guardar cliente: ' + error.message);
    }
  }

  showModal(customer = null) {
    const modal = document.getElementById('customer-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('customer-form');
    
    form.reset();
    
    if (customer) {
      title.textContent = 'Editar Cliente';
      document.getElementById('customer-id').value = customer.id;
      document.getElementById('customer-nombre').value = customer.nombre;
      document.getElementById('customer-telefono').value = customer.telefono || '';
      document.getElementById('customer-direccion').value = customer.direccion || '';
      document.getElementById('customer-documento').value = customer.documento || '';
      document.getElementById('customer-activo').checked = customer.activo !== 0;
    } else {
      title.textContent = 'Nuevo Cliente';
      document.getElementById('customer-id').value = '';
    }
    
    modal.style.display = 'flex';
  }
}
