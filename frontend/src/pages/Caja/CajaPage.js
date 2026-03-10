/**
 * Caja Page - Cierre de Caja
 */

import Header from '../../components/Header/Header.js';

export class CajaPage {
  constructor(container, services) {
    this.container = container;
    this.services = services;
    this.currentCierre = null;
    this.cierres = [];
    this.header = new Header();
  }

  async render() {
    this.container.innerHTML = `
      <div class="page-container">
        ${this.header.render('/caja')}
        <header class="page-header">
          <h1>Cierre de Caja</h1>
          <div class="page-actions">
            <button onclick="window.Router.navigate('/')" class="btn btn-secondary">← Volver al Dashboard</button>
          </div>
        </header>
        
        <div class="page-content">
          <div class="caja-panel">
            <div class="caja-section">
              <h3>Apertura de Caja</h3>
              <div class="form-group">
                <label for="monto-apertura">Monto de Apertura:</label>
                <input type="number" id="monto-apertura" class="form-input" step="0.01" value="0" />
              </div>
              <button id="apertura-btn" class="btn btn-primary">Iniciar Día</button>
            </div>
            
            <div class="caja-section">
              <h3>Resumen del Día</h3>
              <div id="resumen-dia">
                <div class="resumen-item">
                  <span>Ventas en Efectivo:</span>
                  <span id="ventas-efectivo">$0.00</span>
                </div>
                <div class="resumen-item">
                  <span>Ventas con Tarjeta:</span>
                  <span id="ventas-tarjeta">$0.00</span>
                </div>
                <div class="resumen-item">
                  <span>Ventas Cuenta Corriente:</span>
                  <span id="ventas-cc">$0.00</span>
                </div>
                <div class="resumen-item">
                  <span>Total Ventas:</span>
                  <span id="total-ventas">$0.00</span>
                </div>
                <div class="resumen-item">
                  <span>Cantidad de Ventas:</span>
                  <span id="cantidad-ventas">0</span>
                </div>
              </div>
            </div>
            
            <div class="caja-section">
              <h3>Cierre de Caja</h3>
              <div class="form-group">
                <label for="monto-cierre">Monto en Caja:</label>
                <input type="number" id="monto-cierre" class="form-input" step="0.01" />
              </div>
              <div class="form-group">
                <label for="observaciones">Observaciones:</label>
                <textarea id="observaciones" class="form-input" rows="3"></textarea>
              </div>
              <button id="cierre-btn" class="btn btn-danger">Cerrar Caja</button>
            </div>
          </div>
          
          <div class="cierres-section">
            <h3>Historial de Cierres</h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha Apertura</th>
                  <th>Fecha Cierre</th>
                  <th>Monto Apertura</th>
                  <th>Monto Cierre</th>
                  <th>Diferencia</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody id="cierres-tbody">
                <tr><td colspan="7">Cargando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    await this.loadCierres();
    await this.loadResumen();
    this.bindEvents();
    this.header.attachEvents();
  }

  async loadCierres() {
    try {
      this.cierres = await this.services.caja.getAll();
      this.renderCierres();
    } catch (error) {
      console.error('Error loading cierres:', error);
    }
  }

  async loadResumen() {
    try {
      const resumen = await this.services.caja.getResumen();
      
      document.getElementById('ventas-efectivo').textContent = `$${Number(resumen.efectivo || 0).toFixed(2)}`;
      document.getElementById('ventas-tarjeta').textContent = `$${Number(resumen.tarjeta || 0).toFixed(2)}`;
      document.getElementById('ventas-cc').textContent = `$${Number(resumen.cuenta_corriente || 0).toFixed(2)}`;
      document.getElementById('total-ventas').textContent = `$${Number(resumen.total || 0).toFixed(2)}`;
      document.getElementById('cantidad-ventas').textContent = resumen.cantidad || 0;
    } catch (error) {
      console.error('Error loading resumen:', error);
    }
  }

  renderCierres() {
    const tbody = document.getElementById('cierres-tbody');
    if (!tbody) return;
    
    if (!this.cierres.length) {
      tbody.innerHTML = '<tr><td colspan="7">No hay cierres registrados</td></tr>';
      return;
    }
    
    tbody.innerHTML = this.cierres.map(c => {
      const diferencia = Number(c.monto_cierre || 0) - Number(c.monto_apertura || 0);
      const color = diferencia >= 0 ? 'green' : 'red';
      return `
        <tr>
          <td>${c.id}</td>
          <td>${this.formatDate(c.fecha_apertura)}</td>
          <td>${c.fecha_cierre ? this.formatDate(c.fecha_cierre) : 'Abierta'}</td>
          <td>$${Number(c.monto_apertura || 0).toFixed(2)}</td>
          <td>$${Number(c.monto_cierre || 0).toFixed(2)}</td>
          <td style="color: ${color}">$${diferencia.toFixed(2)}</td>
          <td>${c.usuario_nombre || '-'}</td>
        </tr>
      `;
    }).join('');
  }

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('es-AR');
  }

  async aperturaCaja() {
    const monto = parseFloat(document.getElementById('monto-apertura').value) || 0;
    
    try {
      await this.services.caja.apertura(monto);
      alert('Caja abierta correctamente');
      await this.loadCierres();
      await this.loadResumen();
    } catch (error) {
      alert('Error al abrir caja: ' + error.message);
    }
  }

  async cierreCaja() {
    const monto = parseFloat(document.getElementById('monto-cierre').value) || 0;
    const observaciones = document.getElementById('observaciones').value;
    
    if (!confirm('¿Está seguro de cerrar la caja?')) return;
    
    try {
      await this.services.caja.cierre(monto, observaciones);
      alert('Caja cerrada correctamente');
      await this.loadCierres();
      await this.loadResumen();
    } catch (error) {
      alert('Error al cerrar caja: ' + error.message);
    }
  }

  bindEvents() {
    const aperturaBtn = document.getElementById('apertura-btn');
    const cierreBtn = document.getElementById('cierre-btn');
    
    if (aperturaBtn) {
      aperturaBtn.addEventListener('click', () => this.aperturaCaja());
    }
    
    if (cierreBtn) {
      cierreBtn.addEventListener('click', () => this.cierreCaja());
    }

    // Make instance available globally
    window.CajaPageInstance = this;
  }
}
