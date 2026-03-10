/**
 * LoteModal - Handles batch/lot management modals
 */
class LoteModal extends Modal {
    constructor() {
        super('createLoteModal', {
            closeOnOverlay: true,
            closeOnEscape: true
        });
        this.editLoteModal = new Modal('editLoteModal', {
            closeOnOverlay: true,
            closeOnEscape: true
        });
        this.confirmDeliveryModal = new Modal('confirmDeliveryModal', {
            closeOnOverlay: true,
            closeOnEscape: true
        });
    }

    openCreateLoteModal() {
        this.loadProductsForSelect();
        this.loadLoteSuggestion();
        this.open();
    }

    async openEditLoteModal(loteId) {
        try {
            const response = await fetch(`/api/lotes/${loteId}`, {
                headers: getAuthHeaders()
            });
            const lote = await response.json();
            
            document.getElementById('edit-lote-id').value = lote.id;
            document.getElementById('edit-lote-producto').value = lote.producto_id;
            document.getElementById('edit-lote-numero').value = lote.numero_lote;
            document.getElementById('edit-lote-vencimiento').value = lote.fecha_vencimiento;
            document.getElementById('edit-lote-cantidad').value = lote.cantidad_inicial;
            document.getElementById('edit-lote-costo').value = lote.costo_unitario;
            document.getElementById('edit-lote-notas').value = lote.notas || '';
            
            this.editLoteModal.open();
        } catch (error) {
            console.error('Error loading lote:', error);
            this.showError('Error al cargar los datos del lote');
        }
    }

    closeCreateLoteModal() { this.close(); }
    closeEditLoteModal() { this.editLoteModal.close(); }

    async loadProductsForSelect() {
        try {
            const response = await fetch('/api/products', {
                headers: getAuthHeaders()
            });
            const products = await response.json();
            
            const select = document.getElementById('lote-producto');
            const datalist = document.getElementById('lote-productos-list');
            
            if (select && datalist) {
                // Replace select with input+datalist
                select.outerHTML = `<input type="text" id="lote-producto" list="lote-productos-list" required class="form-select" placeholder="Buscar producto..." autocomplete="off" />`;
                
                const newInput = document.getElementById('lote-producto');
                const newDatalist = document.createElement('datalist');
                newDatalist.id = 'lote-productos-list';
                newInput.parentNode.insertBefore(newDatalist, newInput.nextSibling);
                
                newDatalist.innerHTML = '';
                products.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = `${product.codigo} - ${product.nombre}`;
                    newDatalist.appendChild(option);
                });
                
                // Add event listener to auto-generate lot number when product is selected
                newInput.addEventListener('input', async (e) => {
                    const productoId = e.target.value;
                    if (productoId && !isNaN(parseInt(productoId))) {
                        await this.generateLoteNumber(productoId);
                    }
                });
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }
    
    async generateLoteNumber(productoId) {
        try {
            const response = await fetch(`/api/lotes/suggest?producto_id=${productoId}`, {
                headers: getAuthHeaders()
            });
            const data = await response.json();
            
            const numeroLote = document.getElementById('lote-numero');
            const fechaVencimiento = document.getElementById('lote-vencimiento');
            
            if (numeroLote && data.suggested_lote) {
                numeroLote.value = data.suggested_lote;
            }
            if (fechaVencimiento && data.suggested_date) {
                fechaVencimiento.value = data.suggested_date;
            }
        } catch (error) {
            console.error('Error generating lot number:', error);
        }
    }

    async loadLoteSuggestion() {
        try {
            const response = await fetch('/api/lotes/suggest', {
                headers: getAuthHeaders()
            });
            const data = await response.json();
            
            const suggestion = document.getElementById('loteSuggestion');
            const suggestedNum = document.getElementById('suggestedLote');
            
            if (suggestion && suggestedNum && data.suggested_lote) {
                suggestedNum.textContent = data.suggested_lote;
                suggestion.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading suggestion:', error);
        }
    }

    useLoteSuggestion() {
        const suggestedNum = document.getElementById('suggestedLote');
        const numeroLote = document.getElementById('loteNumero');
        
        if (suggestedNum && numeroLote) {
            numeroLote.value = suggestedNum.textContent;
        }
    }

    async createLote() {
        const productoInput = document.getElementById('lote-producto');
        const productoId = parseInt(productoInput.value);
        
        // Validate that a valid product was selected
        if (!productoInput.value || isNaN(productoId)) {
            this.showError('Por favor seleccione un producto válido de la lista');
            return;
        }
        
        const formData = {
            producto_id: productoId,
            numero_lote: document.getElementById('lote-numero').value,
            fecha_vencimiento: document.getElementById('lote-vencimiento').value,
            cantidad_inicial: parseInt(document.getElementById('lote-cantidad').value),
            cantidad_actual: parseInt(document.getElementById('lote-cantidad').value),
            costo_unitario: parseFloat(document.getElementById('lote-costo').value),
            notas: document.getElementById('lote-notas').value || null
        };

        if (!formData.producto_id || !formData.numero_lote || !formData.fecha_vencimiento) {
            this.showError('Por favor complete todos los campos requeridos');
            return;
        }

        try {
            const response = await fetch('/api/lotes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al crear lote');
            }

            this.showSuccess('Lote creado exitosamente');
            this.closeCreateLoteModal();
            
            if (typeof loadLotes === 'function') {
                loadLotes();
            }
        } catch (error) {
            console.error('Error creating lote:', error);
            this.showError(error.message);
        }
    }

    async updateLote() {
        const loteId = document.getElementById('editLoteId').value;
        
        const formData = {
            numero_lote: document.getElementById('editLoteNumero').value,
            fecha_vencimiento: document.getElementById('editLoteVencimiento').value,
            costo_unitario: parseFloat(document.getElementById('editLoteCosto').value),
            notas: document.getElementById('editLoteNotas').value || null
        };

        try {
            const response = await fetch(`/api/lotes/${loteId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Error al actualizar lote');
            }

            this.showSuccess('Lote actualizado exitosamente');
            this.closeEditLoteModal();
            
            if (typeof loadLotes === 'function') {
                loadLotes();
            }
        } catch (error) {
            console.error('Error updating lote:', error);
            this.showError('Error al actualizar el lote');
        }
    }

    async deleteLote(loteId) {
        if (!confirm('¿Está seguro de eliminar este lote?')) {
            return;
        }

        try {
            const response = await fetch(`/api/lotes/${loteId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Error al eliminar lote');
            }

            this.showSuccess('Lote eliminado exitosamente');
            
            if (typeof loadLotes === 'function') {
                loadLotes();
            }
        } catch (error) {
            console.error('Error deleting lote:', error);
            this.showError('Error al eliminar el lote');
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
    window.loteModal = new LoteModal();
});
