/**
 * Promotion Service - Frontend API client for promotions
 */

import { ApiClient } from '../core/ApiClient.js';

class PromotionService {
  constructor() {
    this.apiClient = new ApiClient('/api/promotions');
  }

  async getAll(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `?${queryString}` : '';
    return this.apiClient.get(url);
  }

  async getActive() {
    return this.apiClient.get('/active');
  }

  async getById(id) {
    return this.apiClient.get(`/${id}`);
  }

  async getForProduct(productId) {
    return this.apiClient.get(`/product/${productId}`);
  }

  async create(data) {
    return this.apiClient.post('', data);
  }

  async update(id, data) {
    return this.apiClient.put(`/${id}`, data);
  }

  async delete(id) {
    return this.apiClient.delete(`/${id}`);
  }

  async addProduct(promocionId, productoId, cantidad = 1) {
    return this.apiClient.post(`/${promocionId}/productos`, {
      producto_id: productoId,
      cantidad
    });
  }

  async removeProduct(promocionId, productoId) {
    return this.apiClient.delete(`/${promocionId}/productos/${productoId}`);
  }

  // Helper to format promotion for display
  formatPromotion(promotion) {
    return {
      ...promotion,
      tipoLabel: promotion.tipo === 'combo' ? 'Combo/Pack' : 'Producto Individual',
      estadoLabel: promotion.activa ? 'Activa' : 'Inactiva',
      descuentoLabel: `${promotion.descuento}%`,
      fechaInicio: promotion.fecha_inicio ? new Date(promotion.fecha_inicio).toLocaleDateString() : 'Sin fecha',
      fechaFin: promotion.fecha_fin ? new Date(promotion.fecha_fin).toLocaleDateString() : 'Sin fecha'
    };
  }
}

export const promotionService = new PromotionService();
export default promotionService;
