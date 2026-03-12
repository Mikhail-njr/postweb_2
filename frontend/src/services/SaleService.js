/**
 * Sale Service - Manejo de ventas
 */

export class SaleService {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async getAll() {
    return this.apiClient.get('/ventas');
  }

  async getById(id) {
    return this.apiClient.get(`/ventas/${id}`);
  }

  async getByDate(date) {
    return this.apiClient.get(`/ventas?fecha=${date}`);
  }

  async getByDateRange(startDate, endDate) {
    return this.apiClient.get(`/ventas?inicio=${startDate}&fin=${endDate}`);
  }

  async create(sale) {
    return this.apiClient.post('/ventas', sale);
  }

  async createCuentaCorriente(sale) {
    return this.apiClient.post('/ventas/cuenta-corriente', sale);
  }

  async cancel(id, reason) {
    return this.apiClient.post(`/ventas/${id}/cancelar`, { reason });
  }

  async getDetails(ventaId) {
    return this.apiClient.get(`/ventas/${ventaId}/detalles`);
  }

  async getItems(ventaId) {
    // Try to get items from detalles endpoint
    try {
      return this.apiClient.get(`/ventas/${ventaId}/detalles`);
    } catch (e) {
      // If endpoint doesn't exist, return empty array
      return [];
    }
  }

  async getDailySummary(date) {
    return this.apiClient.get(`/ventas/resumen/dia?fecha=${date}`);
  }

  async getMonthlySummary(year, month) {
    return this.apiClient.get(`/ventas/resumen/mes?anio=${year}&mes=${month}`);
  }

  async getTopProducts(limit = 10) {
    return this.apiClient.get(`/ventas/top?limit=${limit}`);
  }

  async getMostSold(limit = 10, inicio = null, fin = null) {
    let url = `/ventas/mas-vendidos?limit=${limit}`;
    if (inicio) url += `&inicio=${inicio}`;
    if (fin) url += `&fin=${fin}`;
    return this.apiClient.get(url);
  }

  async getLeastSold(limit = 10, inicio = null, fin = null) {
    let url = `/ventas/menos-vendidos?limit=${limit}`;
    if (inicio) url += `&inicio=${inicio}`;
    if (fin) url += `&fin=${fin}`;
    return this.apiClient.get(url);
  }

  async getGeneralSummary(inicio = null, fin = null) {
    let url = '/ventas/resumen-general';
    if (inicio) url += `?inicio=${inicio}`;
    if (fin) url += `${inicio ? '&' : '?'}fin=${fin}`;
    return this.apiClient.get(url);
  }

  async getPaymentMethods() {
    return this.apiClient.get('/ventas/metodos-pago');
  }

  async getTodaySales() {
    const today = new Date().toISOString().split('T')[0];
    return this.getByDate(today);
  }
}

export default SaleService;
