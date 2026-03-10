/**
 * Debt Service - Manejo de deudas/cuenta corriente
 */

export class DebtService {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async getAll() {
    return this.apiClient.get('/deudas');
  }

  async getById(id) {
    return this.apiClient.get(`/deudas/${id}`);
  }

  async getByCustomer(customerId) {
    return this.apiClient.get(`/deudas?cliente=${customerId}`);
  }

  async getPending() {
    return this.apiClient.get('/deudas?estado=pendiente');
  }

  async getOverdue() {
    return this.apiClient.get('/deudas?estado=vencida');
  }

  async create(debt) {
    return this.apiClient.post('/deudas', debt);
  }

  async update(id, debt) {
    return this.apiClient.put(`/deudas/${id}`, debt);
  }

  async pay(id, payment) {
    return this.apiClient.post(`/deudas/${id}/pagar`, payment);
  }

  async cancel(id, reason) {
    return this.apiClient.post(`/deudas/${id}/cancelar`, { reason });
  }

  async getTotalPending() {
    return this.apiClient.get('/deudas/total-pendiente');
  }

  async getSummary() {
    return this.apiClient.get('/deudas/resumen');
  }

  async getCustomerDebtDetails(customerId) {
    return this.apiClient.get(`/customers/${customerId}/deudas-con-productos`);
  }

  async payProduct(customerId, debtId, productId, metodoPago = 'efectivo') {
    return this.apiClient.post(`/customers/${customerId}/deudas/${debtId}/producto/${productId}/pagar`, { metodo_pago: metodoPago });
  }
}

export default DebtService;
