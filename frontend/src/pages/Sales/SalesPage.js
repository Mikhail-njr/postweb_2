/**
 * Sales Page - Historial de Ventas
 */

import Header from '../../components/Header/Header.js';

export class SalesPage {
  constructor(container, services) {
    this.container = container;
    this.services = services;
    this.sales = [];
    this.header = new Header();
  }

  async render() {
    this.container.innerHTML = `
      <div class="page-container">
        ${this.header.render('/sales')}
        <header class="page-header">
          <h1>Ventas</h1>
          <div class="page-actions">
            <button id="view-sales-btn" class="btn btn-secondary">📋 Historial</button>
            <button id="view-metrics-btn" class="btn btn-primary">📊 Métricas</button>
            <button onclick="window.Router.navigate('/')" class="btn btn-secondary">← Volver al Dashboard</button>
          </div>
        </header>
        
        <div class="page-content">
          <!-- Sales History View -->
          <div id="sales-history-view">
            <div class="filters-bar">
              <div class="filter-group">
                <label>Desde:</label>
                <input type="date" id="date-from" class="form-input" />
              </div>
              <div class="filter-group">
                <label>Hasta:</label>
                <input type="date" id="date-to" class="form-input" />
              </div>
              <button id="filter-sales-btn" class="btn btn-primary">Filtrar</button>
              <button id="clear-filter-btn" class="btn btn-secondary">Limpiar</button>
            </div>
            
            <div class="summary-cards">
              <div class="summary-card">
                <h4>Total Ventas Hoy</h4>
                <p class="amount" id="today-total">$0.00</p>
              </div>
              <div class="summary-card">
                <h4>Cantidad Ventas Hoy</h4>
                <p class="amount" id="today-count">0</p>
              </div>
              <div class="summary-card">
                <h4>Total General</h4>
                <p class="amount" id="total-general">$0.00</p>
              </div>
            </div>
            
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="sales-tbody">
                <tr><td colspan="7">Cargando...</td></tr>
              </tbody>
            </table>
          </div>
          
          <!-- Metrics View -->
          <div id="sales-metrics-view" style="display: none;">
            <div class="filters-bar">
              <div class="filter-group">
                <label>Desde:</label>
                <input type="date" id="metrics-date-from" class="form-input" />
              </div>
              <div class="filter-group">
                <label>Hasta:</label>
                <input type="date" id="metrics-date-to" class="form-input" />
              </div>
              <button id="filter-metrics-btn" class="btn btn-primary">Aplicar</button>
            </div>
            
            <div class="metrics-tabs">
              <button class="metrics-tab active" data-metric="general">Información General</button>
              <button class="metrics-tab" data-metric="mas-vendidos">Más Vendidos</button>
              <button class="metrics-tab" data-metric="menos-vendidos">Menos Vendidos</button>
            </div>
            
            <!-- General Info -->
            <div id="metric-general" class="metric-panel">
              <div class="summary-cards">
                <div class="summary-card">
                  <h4>Total Ventas</h4>
                  <p class="amount" id="metric-total-ventas">0</p>
                </div>
                <div class="summary-card">
                  <h4>Monto Total</h4>
                  <p class="amount" id="metric-monto-total">$0.00</p>
                </div>
                <div class="summary-card">
                  <h4>Promedio por Venta</h4>
                  <p class="amount" id="metric-promedio">$0.00</p>
                </div>
                <div class="summary-card">
                  <h4>Productos Vendidos</h4>
                  <p class="amount" id="metric-productos">0</p>
                </div>
              </div>
              
              <h3>Ventas por Día</h3>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cantidad Ventas</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody id="sales-by-day-tbody">
                  <tr><td colspan="3">Cargando...</td></tr>
                </tbody>
              </table>
              
              <h3>Por Método de Pago</h3>
              <div class="summary-cards">
                <div class="summary-card">
                  <h4>Efectivo</h4>
                  <p class="amount" id="metric-efectivo">$0.00</p>
                </div>
                <div class="summary-card">
                  <h4>Tarjeta</h4>
                  <p class="amount" id="metric-tarjeta">$0.00</p>
                </div>
                <div class="summary-card">
                  <h4>Transferencia</h4>
                  <p class="amount" id="metric-transferencia">$0.00</p>
                </div>
              </div>
            </div>
            
            <!-- Most Sold -->
            <div id="metric-mas-vendidos" class="metric-panel" style="display: none;">
              <h3>Productos Más Vendidos</h3>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Cantidad Vendida</th>
                    <th>Total Vendido</th>
                  </tr>
                </thead>
                <tbody id="mas-vendidos-tbody">
                  <tr><td colspan="5">Cargando...</td></tr>
                </tbody>
              </table>
            </div>
            
            <!-- Least Sold -->
            <div id="metric-menos-vendidos" class="metric-panel" style="display: none;">
              <h3>Productos Menos Vendidos</h3>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Cantidad Vendida</th>
                    <th>Total Vendido</th>
                  </tr>
                </thead>
                <tbody id="menos-vendidos-tbody">
                  <tr><td colspan="5">Cargando...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Sale Detail Modal -->
      <div id="sale-modal" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <h3>Detalle de Venta</h3>
            <button class="modal-close" onclick="document.getElementById('sale-modal').style.display='none'">&times;</button>
          </div>
          <div class="modal-body" id="sale-detail">
            <!-- Sale items will be loaded here -->
          </div>
        </div>
      </div>
    `;

    await this.loadSales();
    this.bindEvents();
    this.header.attachEvents();
  }

  async loadSales(dateFrom = null, dateTo = null) {
    try {
      let sales;
      if (dateFrom && dateTo) {
        sales = await this.services.sale.getByDateRange(dateFrom, dateTo);
      } else {
        sales = await this.services.sale.getAll();
      }
      this.sales = sales;
      this.renderSales();
      this.updateSummary();
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  }

  renderSales() {
    const tbody = document.getElementById('sales-tbody');
    if (!tbody) return;
    
    if (!this.sales.length) {
      tbody.innerHTML = '<tr><td colspan="7">No hay ventas</td></tr>';
      return;
    }
    
    tbody.innerHTML = this.sales.map(s => `
      <tr>
        <td>${s.id}</td>
        <td>${this.formatDate(s.fecha)}</td>
        <td>${s.cliente_nombre || 'Mostrador'}</td>
        <td>${s.tipo_pago || 'Efectivo'}</td>
        <td>$${Number(s.total).toFixed(2)}</td>
        <td>${!s.estado || s.estado === 'completada' ? '✅ Completada' : '❌ Cancelada'}</td>
        <td>
          <button class="btn-icon" onclick="window.SalesPageInstance.viewSaleDetail(${s.id})" title="Ver Detalle">👁️</button>
          ${!s.estado || s.estado === 'completada' ? `<button class="btn-icon" onclick="window.SalesPageInstance.cancelSale(${s.id})" title="Cancelar">❌</button>` : ''}
        </td>
      </tr>
    `).join('');
  }

  updateSummary() {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = this.sales.filter(s => s.fecha && s.fecha.startsWith(today));
    const todayTotal = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
    const totalGeneral = this.sales.reduce((sum, s) => sum + Number(s.total), 0);
    
    const todayTotalEl = document.getElementById('today-total');
    const todayCountEl = document.getElementById('today-count');
    const totalGeneralEl = document.getElementById('total-general');
    
    if (todayTotalEl) todayTotalEl.textContent = `$${todayTotal.toFixed(2)}`;
    if (todayCountEl) todayCountEl.textContent = todaySales.length;
    if (totalGeneralEl) totalGeneralEl.textContent = `$${totalGeneral.toFixed(2)}`;
  }

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('es-AR');
  }

  async viewSaleDetail(saleId) {
    try {
      const sale = await this.services.sale.getById(saleId);
      const items = await this.services.sale.getItems(saleId);
      
      const detailDiv = document.getElementById('sale-detail');
      detailDiv.innerHTML = `
        <div class="sale-info">
          <p><strong>ID:</strong> ${sale.id}</p>
          <p><strong>Fecha:</strong> ${this.formatDate(sale.fecha)}</p>
          <p><strong>Cliente:</strong> ${sale.cliente_nombre || 'Mostrador'}</p>
          <p><strong>Tipo de Pago:</strong> ${sale.tipo_pago || 'Efectivo'}</p>
          <p><strong>Estado:</strong> ${sale.estado}</p>
        </div>
        <h4>Items</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.producto_nombre || 'Producto #' + item.producto_id}</td>
                <td>${item.cantidad}</td>
                <td>$${Number(item.precio_unitario).toFixed(2)}</td>
                <td>$${Number(item.subtotal).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3"><strong>Total</strong></td>
              <td><strong>$${Number(sale.total).toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
      `;
      
      document.getElementById('sale-modal').style.display = 'flex';
    } catch (error) {
      alert('Error al cargar detalle de venta: ' + error.message);
    }
  }

  async cancelSale(saleId) {
    if (!confirm('¿Está seguro de cancelar esta venta?')) return;
    
    try {
      await this.services.sale.cancel(saleId);
      await this.loadSales();
    } catch (error) {
      alert('Error al cancelar venta: ' + error.message);
    }
  }

  bindEvents() {
    // View switching
    const viewSalesBtn = document.getElementById('view-sales-btn');
    const viewMetricsBtn = document.getElementById('view-metrics-btn');
    
    if (viewSalesBtn) {
      viewSalesBtn.addEventListener('click', () => {
        document.getElementById('sales-history-view').style.display = 'block';
        document.getElementById('sales-metrics-view').style.display = 'none';
        viewSalesBtn.classList.add('btn-primary');
        viewSalesBtn.classList.remove('btn-secondary');
        viewMetricsBtn.classList.add('btn-secondary');
        viewMetricsBtn.classList.remove('btn-primary');
      });
    }
    
    if (viewMetricsBtn) {
      viewMetricsBtn.addEventListener('click', () => {
        document.getElementById('sales-history-view').style.display = 'none';
        document.getElementById('sales-metrics-view').style.display = 'block';
        viewMetricsBtn.classList.add('btn-primary');
        viewMetricsBtn.classList.remove('btn-secondary');
        viewSalesBtn.classList.add('btn-secondary');
        viewSalesBtn.classList.remove('btn-primary');
        // Load metrics when switching to metrics view
        this.loadGeneralMetrics();
      });
    }
    
    // Metrics tabs
    const metricTabs = document.querySelectorAll('.metrics-tab');
    metricTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Update active tab
        metricTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show corresponding panel
        const metric = tab.dataset.metric;
        document.querySelectorAll('.metric-panel').forEach(p => p.style.display = 'none');
        document.getElementById(`metric-${metric}`).style.display = 'block';
        
        // Load data for the panel
        if (metric === 'general') this.loadGeneralMetrics();
        else if (metric === 'mas-vendidos') this.loadMostSold();
        else if (metric === 'menos-vendidos') this.loadLeastSold();
      });
    });
    
    // Filter metrics
    const filterMetricsBtn = document.getElementById('filter-metrics-btn');
    if (filterMetricsBtn) {
      filterMetricsBtn.addEventListener('click', () => {
        const activeTab = document.querySelector('.metrics-tab.active');
        if (activeTab) {
          const metric = activeTab.dataset.metric;
          if (metric === 'general') this.loadGeneralMetrics();
          else if (metric === 'mas-vendidos') this.loadMostSold();
          else if (metric === 'menos-vendidos') this.loadLeastSold();
        }
      });
    }
    
    // Sales filters
    const filterBtn = document.getElementById('filter-sales-btn');
    const clearBtn = document.getElementById('clear-filter-btn');
    
    if (filterBtn) {
      filterBtn.addEventListener('click', async () => {
        const dateFrom = document.getElementById('date-from').value;
        const dateTo = document.getElementById('date-to').value;
        await this.loadSales(dateFrom, dateTo);
      });
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';
        await this.loadSales();
      });
    }

    // Make instance available globally
    window.SalesPageInstance = this;
  }

  async loadGeneralMetrics() {
    try {
      const dateFrom = document.getElementById('metrics-date-from').value;
      const dateTo = document.getElementById('metrics-date-to').value;
      
      const data = await this.services.sale.getGeneralSummary(dateFrom || null, dateTo || null);
      
      document.getElementById('metric-total-ventas').textContent = data.resumen.total_ventas;
      document.getElementById('metric-monto-total').textContent = `${Number(data.resumen.monto_total).toFixed(2)}`;
      document.getElementById('metric-promedio').textContent = `${Number(data.resumen.promedio_venta).toFixed(2)}`;
      document.getElementById('metric-productos').textContent = data.cantidad_productos;
      document.getElementById('metric-efectivo').textContent = `${Number(data.resumen.efectivo).toFixed(2)}`;
      document.getElementById('metric-tarjeta').textContent = `${Number(data.resumen.tarjeta).toFixed(2)}`;
      document.getElementById('metric-transferencia').textContent = `${Number(data.resumen.transferencia).toFixed(2)}`;
      
      // Sales by day
      const tbody = document.getElementById('sales-by-day-tbody');
      if (data.ventas_por_dia && data.ventas_por_dia.length) {
        tbody.innerHTML = data.ventas_por_dia.map(d => `
          <tr>
            <td>${d.fecha}</td>
            <td>${d.cantidad}</td>
            <td>${Number(d.total).toFixed(2)}</td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = '<tr><td colspan="3">No hay datos</td></tr>';
      }
    } catch (error) {
      console.error('Error loading general metrics:', error);
    }
  }

  async loadMostSold() {
    try {
      const dateFrom = document.getElementById('metrics-date-from').value;
      const dateTo = document.getElementById('metrics-date-to').value;
      
      const products = await this.services.sale.getMostSold(10, dateFrom || null, dateTo || null);
      
      const tbody = document.getElementById('mas-vendidos-tbody');
      if (products && products.length) {
        tbody.innerHTML = products.map((p, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${p.codigo || '-'}</td>
            <td>${p.producto_nombre || 'Producto #' + p.producto_id}</td>
            <td>${p.cantidad_vendida}</td>
            <td>${Number(p.total_vendido).toFixed(2)}</td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = '<tr><td colspan="5">No hay datos</td></tr>';
      }
    } catch (error) {
      console.error('Error loading most sold:', error);
    }
  }

  async loadLeastSold() {
    try {
      const dateFrom = document.getElementById('metrics-date-from').value;
      const dateTo = document.getElementById('metrics-date-to').value;
      
      const products = await this.services.sale.getLeastSold(10, dateFrom || null, dateTo || null);
      
      const tbody = document.getElementById('menos-vendidos-tbody');
      if (products && products.length) {
        tbody.innerHTML = products.map((p, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${p.codigo || '-'}</td>
            <td>${p.producto_nombre || 'Producto #' + p.producto_id}</td>
            <td>${p.cantidad_vendida}</td>
            <td>${Number(p.total_vendido).toFixed(2)}</td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = '<tr><td colspan="5">No hay datos</td></tr>';
      }
    } catch (error) {
      console.error('Error loading least sold:', error);
    }
  }
}
