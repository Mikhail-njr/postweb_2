/**
 * Promotions Page - Manage promotions (combos and individual)
 */

import { promotionService } from '../../services/PromotionService.js';
import { EventBus } from '../../core/EventBus.js';

export class PromotionsPage {
  constructor(container) {
    this.container = container;
    this.promotions = [];
    this.products = [];
    this.editingPromotion = null;
    this.productService = window.Services?.product || window.Services?.promotion?.apiClient ? null : null;
    this.showModal = this.showModal.bind(this);
  }

  async init() {
    await this.loadPromotions();
    await this.loadProducts();
    this.render();
    this.attachEventListeners();
  }

  async loadPromotions() {
    try {
      this.promotions = await promotionService.getAll();
    } catch (error) {
      console.error('Error loading promotions:', error);
      this.promotions = [];
    }
  }

  async loadProducts() {
    try {
      const response = await window.Services.product.getAll();
      this.products = Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error loading products:', error);
      this.products = [];
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="promotions-page">
        <div class="page-header">
          <div class="header-left">
            <button class="btn btn-secondary" id="back-btn">
              ← Volver
            </button>
            <h1>Promociones</h1>
          </div>
          <button class="btn btn-primary" id="add-promotion-btn">
            + Nueva Promoción
          </button>
        </div>

        <div class="filters">
          <select id="filter-tipo" class="form-control">
            <option value="">Todos los tipos</option>
            <option value="individual">Producto Individual</option>
            <option value="combo">Combo/Pack</option>
          </select>
          <select id="filter-activa" class="form-control">
            <option value="">Todos los estados</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>
        </div>

        <div class="promotions-grid" id="promotions-grid">
          ${this.renderPromotions()}
        </div>
      </div>

      ${this.renderModal()}
    `;
  }

  renderPromotions() {
    if (!this.promotions || this.promotions.length === 0) {
      return `
        <div class="empty-state">
          <p>No hay promociones creadas</p>
          <p>Crea tu primera promoción para aumentar tus ventas</p>
        </div>
      `;
    }

    return this.promotions.map(promo => this.renderPromotionCard(promo)).join('');
  }

  renderPromotionCard(promo) {
    const tipoLabel = promo.tipo === 'combo' ? 'Combo/Pack' : 'Individual';
    const tipoClass = promo.tipo === 'combo' ? 'badge-combo' : 'badge-individual';
    const estadoClass = promo.activa ? 'badge-active' : 'badge-inactive';
    const productoCount = promo.productos ? promo.productos.length : 0;
    
    // Get product names
    let productsLabel = '';
    if (promo.productos && promo.productos.length > 0) {
      const names = promo.productos.slice(0, 3).map(p => p.nombre).join(', ');
      productsLabel = promo.productos.length > 3 
        ? `${names}... (+${promo.productos.length - 3})` 
        : names;
    }

    return `
      <div class="promotion-card" data-id="${promo.id}">
        <div class="promotion-header">
          <span class="badge ${tipoClass}">${tipoLabel}</span>
          <span class="badge ${estadoClass}">${promo.activa ? 'Activa' : 'Inactiva'}</span>
        </div>
        <h3 class="promotion-title">${promo.nombre}</h3>
        <p class="promotion-description">${promo.descripcion || 'Sin descripción'}</p>
        <div class="promotion-discount">
          <span class="discount-value">-${promo.descuento}%</span>
        </div>
        <div class="promotion-products">
          <small>${productsLabel || `${productoCount} producto(s) ${promo.tipo === 'combo' ? 'en el combo' : 'afectado(s)'}`}</small>
        </div>
        <div class="promotion-dates">
          <small>${promo.fecha_inicio ? new Date(promo.fecha_inicio).toLocaleDateString() : 'Sin fecha inicio'}</small>
          <small> - </small>
          <small>${promo.fecha_fin ? new Date(promo.fecha_fin).toLocaleDateString() : 'Sin fecha fin'}</small>
        </div>
        <div class="promotion-actions">
          <button class="btn btn-sm btn-edit" data-id="${promo.id}">Editar</button>
          <button class="btn btn-sm btn-danger btn-delete" data-id="${promo.id}">Eliminar</button>
        </div>
      </div>
    `;
  }

  renderModal() {
    const isEditing = this.editingPromotion ? true : false;
    const promo = this.editingPromotion || {};

    return `
      <div class="modal" id="promotion-modal" style="display: none;">
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h2>${isEditing ? 'Editar' : 'Nueva'} Promoción</h2>
            <button class="modal-close" id="close-modal">&times;</button>
          </div>
          <form id="promotion-form">
            <div class="form-group">
              <label for="promo-nombre">Nombre *</label>
              <input type="text" id="promo-nombre" class="form-control" required 
                value="${promo.nombre || ''}" placeholder="ej: Descuento de Verano">
            </div>

            <div class="form-group">
              <label for="promo-descripcion">Descripción</label>
              <textarea id="promo-descripcion" class="form-control" rows="2"
                placeholder="ej: Promoción especial de temporada">${promo.descripcion || ''}</textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="promo-tipo">Tipo *</label>
                <select id="promo-tipo" class="form-control" required>
                  <option value="individual" ${promo.tipo === 'individual' ? 'selected' : ''}>
                    Producto Individual
                  </option>
                  <option value="combo" ${promo.tipo === 'combo' ? 'selected' : ''}>
                    Combo/Pack
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="promo-descuento">Descuento (%) *</label>
                <input type="number" id="promo-descuento" class="form-control" 
                  min="0" max="100" required value="${promo.descuento || 0}"
                  placeholder="ej: 20">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="promo-fecha-inicio">Fecha Inicio</label>
                <input type="date" id="promo-fecha-inicio" class="form-control" 
                  value="${promo.fecha_inicio ? promo.fecha_inicio.split('T')[0] : ''}">
              </div>

              <div class="form-group">
                <label for="promo-fecha-fin">Fecha Fin</label>
                <input type="date" id="promo-fecha-fin" class="form-control"
                  value="${promo.fecha_fin ? promo.fecha_fin.split('T')[0] : ''}">
              </div>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" id="promo-activa" ${promo.activa || promo.activa === undefined ? 'checked' : ''}>
                Activar promoción inmediatamente
              </label>
            </div>

            <div class="form-group" id="products-section">
              <label>Productos ${promo.tipo === 'combo' ? 'del Combo' : 'Afectados'} *</label>
              <div class="products-select-container">
                <select id="product-select" class="form-control">
                  <option value="">Seleccionar producto...</option>
                  ${this.products.map(p => `
                    <option value="${p.id}" data-precio="${p.precio}">${p.nombre} ($${p.precio})</option>
                  `).join('')}
                </select>
                <button type="button" class="btn btn-secondary" id="add-product-btn">Agregar</button>
              </div>
              <div id="selected-products" class="selected-products-list">
                ${this.renderSelectedProducts(promo.productos || [])}
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="cancel-btn">Cancelar</button>
              <button type="submit" class="btn btn-primary">
                ${isEditing ? 'Guardar Cambios' : 'Crear Promoción'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  renderSelectedProducts(products) {
    if (!products || products.length === 0) {
      return '<p class="no-products">No hay productos seleccionados</p>';
    }

    return products.map((p, index) => `
      <div class="selected-product-item">
        <span>${p.nombre} - $${p.precio}</span>
        <button type="button" class="btn-remove-product" data-index="${index}" data-id="${p.id}">&times;</button>
      </div>
    `).join('');
  }

  attachEventListeners() {
    // Back button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.Router?.navigate('/');
      });
    }

    // Add button
    const addBtn = document.getElementById('add-promotion-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showModal());
    }

    // Modal close
    const closeBtn = document.getElementById('close-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideModal());
    }

    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideModal());
    }

    // Form submit
    const form = document.getElementById('promotion-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Add product to promotion
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
      addProductBtn.addEventListener('click', () => this.addProductToSelection());
    }

    // Remove product from selection
    const removeBtns = document.querySelectorAll('.btn-remove-product');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.removeProductFromSelection(e));
    });

    // Edit buttons
    const editBtns = document.querySelectorAll('.btn-edit');
    editBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleEdit(e));
    });

    // Delete buttons
    const deleteBtns = document.querySelectorAll('.btn-delete');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleDelete(e));
    });

    // Filters
    const filterTipo = document.getElementById('filter-tipo');
    if (filterTipo) {
      filterTipo.addEventListener('change', () => this.applyFilters());
    }

    const filterActiva = document.getElementById('filter-activa');
    if (filterActiva) {
      filterActiva.addEventListener('change', () => this.applyFilters());
    }
  }

  selectedProducts = [];

  showModal(promotion = null) {
    this.editingPromotion = promotion;
    this.selectedProducts = promotion && promotion.productos ? [...promotion.productos] : [];
    
    // Re-render with modal
    const modal = document.getElementById('promotion-modal');
    if (modal) {
      modal.remove();
    }
    
    // Add modal to DOM
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.renderModal();
    document.body.appendChild(tempDiv.firstElementChild);
    
    this.attachEventListeners();
    
    document.getElementById('promotion-modal').style.display = 'flex';
  }

  hideModal() {
    const modal = document.getElementById('promotion-modal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.editingPromotion = null;
    this.selectedProducts = [];
  }

  addProductToSelection() {
    const select = document.getElementById('product-select');
    const productoId = parseInt(select.value);
    
    if (!productoId) return;
    
    // Check if already added
    if (this.selectedProducts.some(p => p.id === productoId)) {
      alert('Este producto ya está agregado');
      return;
    }
    
    // Get product details
    const product = this.products.find(p => p.id === productoId);
    if (product) {
      this.selectedProducts.push(product);
      this.updateSelectedProductsList();
    }
    
    select.value = '';
  }

  removeProductFromSelection(e) {
    const index = parseInt(e.target.dataset.index);
    const id = parseInt(e.target.dataset.id);
    
    this.selectedProducts = this.selectedProducts.filter(p => p.id !== id);
    this.updateSelectedProductsList();
  }

  updateSelectedProductsList() {
    const container = document.getElementById('selected-products');
    if (container) {
      container.innerHTML = this.renderSelectedProducts(this.selectedProducts);
      
      // Re-attach event listeners
      const removeBtns = container.querySelectorAll('.btn-remove-product');
      removeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => this.removeProductFromSelection(e));
      });
    }
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('promo-nombre').value;
    const descripcion = document.getElementById('promo-descripcion').value;
    const tipo = document.getElementById('promo-tipo').value;
    const descuento = parseInt(document.getElementById('promo-descuento').value);
    const fecha_inicio = document.getElementById('promo-fecha-inicio').value || null;
    const fecha_fin = document.getElementById('promo-fecha-fin').value || null;
    const activa = document.getElementById('promo-activa').checked;
    
    // Validate products
    if (tipo === 'combo' && this.selectedProducts.length < 2) {
      alert('Los combos deben tener al menos 2 productos');
      return;
    }
    
    const data = {
      nombre,
      descripcion,
      tipo,
      descuento,
      fecha_inicio,
      fecha_fin,
      activa,
      productos: this.selectedProducts.map(p => ({ id: p.id }))
    };
    
    try {
      if (this.editingPromotion) {
        await promotionService.update(this.editingPromotion.id, data);
      } else {
        await promotionService.create(data);
      }
      
      await this.loadPromotions();
      this.hideModal();
      this.render();
      this.attachEventListeners();
      
      if (window.EventBus) {
        window.EventBus.emit('notification', {
          type: 'success',
          message: `Promoción ${this.editingPromotion ? 'actualizada' : 'creada'} exitosamente`
        });
      }
    } catch (error) {
      console.error('Error saving promotion:', error);
      alert('Error al guardar la promoción: ' + (error.message || 'Error desconocido'));
    }
  }

  async handleEdit(e) {
    const id = parseInt(e.target.dataset.id);
    const promotion = this.promotions.find(p => p.id === id);
    
    if (promotion) {
      this.showModal(promotion);
    }
  }

  async handleDelete(e) {
    const id = parseInt(e.target.dataset.id);
    
    if (!confirm('¿Estás seguro de eliminar esta promoción?')) {
      return;
    }
    
    try {
      await promotionService.delete(id);
      await this.loadPromotions();
      this.render();
      this.attachEventListeners();
      
      EventBus.emit('notification', {
        type: 'success',
        message: 'Promoción eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error deleting promotion:', error);
      alert('Error al eliminar la promoción');
    }
  }

  applyFilters() {
    const tipoFilter = document.getElementById('filter-tipo').value;
    const activaFilter = document.getElementById('filter-activa').value;
    
    // Reload all and filter
    this.loadPromotions().then(() => {
      let filtered = [...this.promotions];
      
      if (tipoFilter) {
        filtered = filtered.filter(p => p.tipo === tipoFilter);
      }
      
      if (activaFilter) {
        const isActiva = activaFilter === 'true';
        filtered = filtered.filter(p => p.activa === isActiva);
      }
      
      this.promotions = filtered;
      document.getElementById('promotions-grid').innerHTML = this.renderPromotions();
      this.attachEventListeners();
    });
  }
}

export default PromotionsPage;
