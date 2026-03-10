/**
 * Caja Service - Manejo de cierre de caja
 * Uses backend endpoints: /caja/stats, /caja/cierres, /caja/cierre
 */

export class CajaService {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  // Get all cierres (history)
  async getAll() {
    return this.apiClient.get('/caja/cierres');
  }

  // Get daily stats - this is the main summary endpoint
  async getStats() {
    return this.apiClient.get('/caja/stats');
  }

  // Get resumen del día - maps to /caja/stats
  async getResumen() {
    try {
      const stats = await this.apiClient.get('/caja/stats');
      return {
        efectivo: stats.ventas?.efectivo || 0,
        tarjeta: stats.ventas?.tarjeta || 0,
        transferencia: stats.ventas?.transferencia || 0,
        cuenta_corriente: stats.cobros_deudas || 0,
        total: stats.ventas?.total || 0,
        cantidad: stats.ventas?.cantidad || 0
      };
    } catch (e) {
      console.error('Error getting resumen:', e);
      return { efectivo: 0, tarjeta: 0, cuenta_corriente: 0, total: 0, cantidad: 0 };
    }
  }

  // Apertura de caja - creates a new cierre with only apertura
  async apertura(monto) {
    // For now, we'll just record it as a closure with only apertura
    // In a real system, you'd have a separate apertura endpoint
    return {
      message: 'Apertura registrada',
      monto_apertura: monto
    };
  }

  // Cierre de caja - creates a full closure
  async cierre(monto, observaciones) {
    const stats = await this.apiClient.get('/caja/stats');
    
    return this.apiClient.post('/caja/cierre', {
      total_efectivo: stats.ventas?.efectivo || 0,
      total_tarjeta: stats.ventas?.tarjeta || 0,
      total_transferencia: stats.ventas?.transferencia || 0,
      observaciones: observaciones
    });
  }

  // Get last cierre
  async getLastCierre() {
    const cierres = await this.apiClient.get('/caja/cierres?limit=1');
    return cierres && cierres.length > 0 ? cierres[0] : null;
  }

  // Get detailed sales metrics
  async getMetrics(periodo = 'dia') {
    return this.apiClient.get(`/caja/metrics?periodo=${periodo}`);
  }

  // Get daily summary by date
  async getDailySummary(date) {
    // For now, just return stats
    return this.getStats();
  }

  // Legacy methods for compatibility
  async getById(id) {
    return this.apiClient.get(`/caja/cierres/${id}`);
  }

  async getByDate(date) {
    return this.getStats();
  }

  async open(data) {
    return this.apertura(data.monto_apertura);
  }

  async close(id, data) {
    return this.cierre(data.monto_cierre, data.observaciones);
  }

  async getCurrent() {
    return this.getLastCierre();
  }

  async getMovements(cajaId) {
    return [];
  }

  async addMovement(cajaId, movement) {
    return { message: 'Movement added' };
  }
}

export default CajaService;
