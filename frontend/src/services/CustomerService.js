/**
 * Customer Service - Manejo de clientes
 */

export class CustomerService {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async getAll() {
    return this.apiClient.get('/customers');
  }

  async getById(id) {
    return this.apiClient.get(`/customers/${id}`);
  }

  async search(query) {
    return this.apiClient.get(`/customers/search?q=${encodeURIComponent(query)}`);
  }

  async create(customer) {
    return this.apiClient.post('/customers', customer);
  }

  async update(id, customer) {
    return this.apiClient.put(`/customers/${id}`, customer);
  }

  async delete(id) {
    return this.apiClient.delete(`/customers/${id}`);
  }

  async getDebt(customerId) {
    return this.apiClient.get(`/customers/${customerId}/deuda`);
  }

  async getDebtHistory(customerId) {
    return this.apiClient.get(`/customers/${customerId}/historial-deudas`);
  }

  async addDebt(customerId, debt) {
    return this.apiClient.post(`/customers/${customerId}/agregar-deuda`, debt);
  }

  async payDebt(customerId, payment) {
    return this.apiClient.post(`/customers/${customerId}/pagar-deuda`, payment);
  }
}

export default CustomerService;
