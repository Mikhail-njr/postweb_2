/**
 * SupplierModal - Handles supplier management modals
 */
class SupplierModal extends Modal {
    constructor() {
        super('addSupplierModal', {
            closeOnOverlay: true,
            closeOnEscape: true
        });
        this.editModal = new Modal('editSupplierModal', {
            closeOnOverlay: true,
            closeOnEscape: true
        });
        this.orderModal = new Modal('createOrderModal', {
            closeOnOverlay: true,
            closeOnEscape: true
        });
    }

    openAddSupplierModal() {
        this.resetForm('addSupplierForm');
        this.open();
    }

    async openEditSupplierModal(supplierId) {
        try {
            const response = await fetch(`/api/suppliers/${supplierId}`, {
                headers: getAuthHeaders()
            });
            const supplier = await response.json();
            
            document.getElementById('editSupplierId').value = supplier.id;
            document.getElementById('editSupplierName').value = supplier.nombre;
            document.getElementById('editSupplierEmail').value = supplier.email || '';
            document.getElementById('editSupplierPhone').value = supplier.telefono || '';
            document.getElementById('editSupplierAddress').value = supplier.direccion || '';
            document.getElementById('editSupplierNotes').value = supplier.notas || '';
            
            this.editModal.open();
        } catch (error) {
            console.error('Error loading supplier:', error);
            this.showError('Error al cargar los datos del proveedor');
        }
    }

    async createSupplier(event) {
        event.preventDefault();
        
        const formData = {
            nombre: document.getElementById('addSupplierName').value,
            email: document.getElementById('addSupplierEmail').value || null,
            telefono: document.getElementById('addSupplierPhone').value || null,
            direccion: document.getElementById('addSupplierAddress').value || null,
            notas: document.getElementById('addSupplierNotes').value || null
        };

        try {
            const response = await fetch('/api/suppliers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Error al crear proveedor');
            }

            this.showSuccess('Proveedor creado exitosamente');
            this.close();
            
            if (typeof loadProveedores === 'function') {
                loadProveedores();
            }
        } catch (error) {
            console.error('Error creating supplier:', error);
            this.showError('Error al crear el proveedor');
        }
    }

    async updateSupplier(event) {
        event.preventDefault();
        
        const supplierId = document.getElementById('editSupplierId').value;
        const formData = {
            nombre: document.getElementById('editSupplierName').value,
            email: document.getElementById('editSupplierEmail').value || null,
            telefono: document.getElementById('editSupplierPhone').value || null,
            direccion: document.getElementById('editSupplierAddress').value || null,
            notas: document.getElementById('editSupplierNotes').value || null
        };

        try {
            const response = await fetch(`/api/suppliers/${supplierId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Error al actualizar proveedor');
            }

            this.showSuccess('Proveedor actualizado exitosamente');
            this.editModal.close();
            
            if (typeof loadProveedores === 'function') {
                loadProveedores();
            }
        } catch (error) {
            console.error('Error updating supplier:', error);
            this.showError('Error al actualizar el proveedor');
        }
    }

    async deleteSupplier(supplierId) {
        if (!confirm('¿Está seguro de eliminar este proveedor?')) {
            return;
        }

        try {
            const response = await fetch(`/api/suppliers/${supplierId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Error al eliminar proveedor');
            }

            this.showSuccess('Proveedor eliminado exitosamente');
            
            if (typeof loadProveedores === 'function') {
                loadProveedores();
            }
        } catch (error) {
            console.error('Error deleting supplier:', error);
            this.showError('Error al eliminar el proveedor');
        }
    }

    closeAddSupplierModal() { this.close(); }
    closeEditSupplierModal() { this.editModal.close(); }
    closeCreateOrderModal() { this.orderModal.close(); }
}

function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof authCredentials !== 'undefined' && authCredentials) {
        headers['Authorization'] = 'Basic ' + btoa(authCredentials.username + ':' + authCredentials.password);
    }
    return headers;
}

window.addEventListener('DOMContentLoaded', () => {
    window.supplierModal = new SupplierModal();
});
