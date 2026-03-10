/**
 * ProductModal - Handles product creation and editing modals
 */
class ProductModal extends Modal {
    constructor() {
        super('addModal', {
            closeOnOverlay: true,
            closeOnEscape: true
        });
        this.editModal = new Modal('editModal', {
            closeOnOverlay: true,
            closeOnEscape: true
        });
    }

    onOpen() {
        this.resetForm('addProductForm');
    }

    openAddModal() {
        this.resetForm('addProductForm');
        this.open();
    }

    async openEditModal(productId) {
        try {
            const response = await fetch(`/api/products/${productId}`, {
                headers: getAuthHeaders()
            });
            const product = await response.json();
            
            document.getElementById('editProductId').value = product.id;
            document.getElementById('editProductName').value = product.nombre;
            document.getElementById('editProductCode').value = product.codigo;
            document.getElementById('editProductDescription').value = product.descripcion || '';
            document.getElementById('editProductPrice').value = product.precio;
            document.getElementById('editProductStock').value = product.stock;
            document.getElementById('editProductCategory').value = product.categoria;
            document.getElementById('editBarcode').value = product.codigo_barras || '';
            
            this.editModal.open();
        } catch (error) {
            console.error('Error loading product:', error);
            this.showError('Error al cargar los datos del producto');
        }
    }

    closeAddModal() {
        this.close();
    }

    closeEditModal() {
        this.editModal.close();
    }

    async createProduct(event) {
        event.preventDefault();
        
        const formData = {
            codigo: document.getElementById('addProductCode').value,
            nombre: document.getElementById('addProductName').value,
            descripcion: document.getElementById('addProductDescription').value,
            precio: parseFloat(document.getElementById('addProductPrice').value),
            stock: parseInt(document.getElementById('addProductStock').value),
            categoria: document.getElementById('addProductCategory').value,
            codigo_barras: document.getElementById('addBarcode').value || null
        };

        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Error al crear producto');
            }

            this.showSuccess('Producto creado exitosamente');
            this.closeAddModal();
            
            if (typeof fetchAndDisplayData === 'function') {
                fetchAndDisplayData();
            }
        } catch (error) {
            console.error('Error creating product:', error);
            this.showError('Error al crear el producto');
        }
    }

    async updateProduct(event) {
        event.preventDefault();
        
        const productId = document.getElementById('editProductId').value;
        const formData = {
            codigo: document.getElementById('editProductCode').value,
            nombre: document.getElementById('editProductName').value,
            descripcion: document.getElementById('editProductDescription').value,
            precio: parseFloat(document.getElementById('editProductPrice').value),
            stock: parseInt(document.getElementById('editProductStock').value),
            categoria: document.getElementById('editProductCategory').value,
            codigo_barras: document.getElementById('editBarcode').value || null
        };

        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Error al actualizar producto');
            }

            this.showSuccess('Producto actualizado exitosamente');
            this.closeEditModal();
            
            if (typeof fetchAndDisplayData === 'function') {
                fetchAndDisplayData();
            }
        } catch (error) {
            console.error('Error updating product:', error);
            this.showError('Error al actualizar el producto');
        }
    }

    async deleteProduct(productId) {
        if (!confirm('¿Está seguro de eliminar este producto?')) {
            return;
        }

        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Error al eliminar producto');
            }

            this.showSuccess('Producto eliminado exitosamente');
            
            if (typeof fetchAndDisplayData === 'function') {
                fetchAndDisplayData();
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            this.showError('Error al eliminar el producto');
        }
    }
}

function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof authCredentials !== 'undefined' && authCredentials) {
        headers['Authorization'] = 'Basic ' + btoa(authCredentials.username + ':' + authCredentials.password);
    }
    return headers;
}

window.addEventListener('DOMContentLoaded', () => {
    window.productModal = new ProductModal();
});
