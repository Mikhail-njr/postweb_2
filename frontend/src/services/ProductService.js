/**
 * Product Service - Manejo de productos
 */

export class ProductService {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async getAll() {
    return this.apiClient.get('/products');
  }

  async getById(id) {
    return this.apiClient.get(`/products/${id}`);
  }

  async search(query) {
    return this.apiClient.get(`/products/search?q=${encodeURIComponent(query)}`);
  }

  async getByCategory(category) {
    return this.apiClient.get(`/products?categoria=${encodeURIComponent(category)}`);
  }

  async searchByBarcode(barcode) {
    return this.apiClient.get(`/products/search-by-barcode/${encodeURIComponent(barcode)}`);
  }

  async create(product) {
    return this.apiClient.post('/products', product);
  }

  async update(id, product) {
    return this.apiClient.put(`/products/${id}`, product);
  }

  async delete(id) {
    return this.apiClient.delete(`/products/${id}`);
  }

  async getLotes(productId) {
    return this.apiClient.get(`/products/${productId}/lotes`);
  }

  async createLote(productId, lote) {
    return this.apiClient.post(`/products/${productId}/lotes`, lote);
  }

  async updateLote(productId, loteId, lote) {
    return this.apiClient.put(`/products/${productId}/lotes/${loteId}`, lote);
  }

  async deleteLote(productId, loteId) {
    return this.apiClient.delete(`/products/${productId}/lotes/${loteId}`);
  }

  async getCategories() {
    const products = await this.getAll();
    const categories = [...new Set(products.map(p => p.categoria).filter(Boolean))];
    return categories.sort();
  }

  async getLowStock(threshold = 10) {
    const products = await this.getAll();
    return products.filter(p => (p.stock_calculado ?? p.stock) > 0 && (p.stock_calculado ?? p.stock) <= threshold);
  }
}

export default ProductService;
