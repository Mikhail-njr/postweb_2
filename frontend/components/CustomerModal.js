/**
 * CustomerModal - Handles customer (cliente) management modals
 */
class CustomerModal extends Modal {
    constructor() {
        super('addClientModal', {
            closeOnOverlay: true,
            closeOnEscape: true
        });
        this.editModal = new Modal('editClientModal', {
            closeOnOverlay: true,
            closeOnEscape: true
        });
        this.debtsModal = new Modal('clientDebtsModal', {
            closeOnOverlay: true,
            closeOnEscape: true
        });
    }

    openAddClientModal() {
        this.resetForm('addClientForm');
        this.open();
    }

    async openEditClientModal(clientId) {
        try {
            const response = await fetch(`/api/clientes/${clientId}`, {
                headers: getAuthHeaders()
            });
            const client = await response.json();
            
            document.getElementById('editClientId').value = client.id;
            document.getElementById('editClientName').value = client.nombre;
            document.getElementById('editClientEmail').value = client.email || '';
            document.getElementById('editClientPhone').value = client.telefono || '';
            document.getElementById('editClientAddress').value = client.direccion || '';
            document.getElementById('editClientLimit').value = client.limite_credito || 0;
            
            this.editModal.open();
        } catch (error) {
            console.error('Error loading client:', error);
            this.showError('Error al cargar los datos del cliente');
        }
    }

    async openClientDebtsModal(clientId) {
        try {
            const response = await fetch(`/api/clientes/${clientId}/deudas-con-productos`, {
                headers: getAuthHeaders()
            });
            const debts = await response.json();
            
            this.currentClientId = clientId;
            this.displayDebts(debts);
            this.debtsModal.open();
        } catch (error) {
            console.error('Error loading debts:', error);
            this.showError('Error al cargar las deudas del cliente');
        }
    }

    displayDebts(debts) {
        const container = document.getElementById('clientDebtsList');
        if (!container) return;

        if (debts.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 20px;">El cliente no tiene deudas pendientes</p>';
            return;
        }

        container.innerHTML = debts.map(deuda => `
            <div style="padding: 15px; border-bottom: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${deuda.producto_nombre || 'Producto'}</strong><br>
                        <small>Factura: ${deuda.numero_factura}</small><br>
                        <small>Fecha: ${deuda.fecha}</small>
                    </div>
                    <div style="text-align: right;">
                        <strong>$${deuda.monto_pendiente.toFixed(2)}</strong><br>
                        <button class="btn btn-primary" 
                                onclick="registerPayment(${deuda.id}, ${deuda.producto_id}, ${deuda.monto_pendiente}, '${deuda.numero_factura}')"
                                style="margin-top: 5px;">
                            Pagar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async registerPayment(deudaId, productoId, monto, numeroFactura) {
        const montoPagar = prompt(`Monto a pagar:`, monto.toFixed(2));
        
        if (!montoPagar || parseFloat(montoPagar) <= 0) {
            return;
        }

        const montoNum = parseFloat(montoPagar);

        try {
            const response = await fetch(`/api/deudas/${deudaId}/pagar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    monto: montoNum,
                    numero_factura: numeroFactura
                })
            });

            if (!response.ok) {
                throw new Error('Error al registrar pago');
            }

            this.showSuccess('Pago registrado exitosamente');
            
            if (this.currentClientId) {
                this.openClientDebtsModal(this.currentClientId);
            }
        } catch (error) {
            console.error('Error registering payment:', error);
            this.showError('Error al registrar el pago');
        }
    }

    async createClient(event) {
        event.preventDefault();
        
        const formData = {
            nombre: document.getElementById('addClientName').value,
            email: document.getElementById('addClientEmail').value || null,
            telefono: document.getElementById('addClientPhone').value || null,
            direccion: document.getElementById('addClientAddress').value || null,
            limite_credito: parseFloat(document.getElementById('addClientLimit').value) || 0
        };

        try {
            const response = await fetch('/api/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Error al crear cliente');
            }

            this.showSuccess('Cliente creado exitosamente');
            this.close();
            
            if (typeof loadClientes === 'function') {
                loadClientes();
            }
        } catch (error) {
            console.error('Error creating client:', error);
            this.showError('Error al crear el cliente');
        }
    }

    async updateClient(event) {
        event.preventDefault();
        
        const clientId = document.getElementById('editClientId').value;
        const formData = {
            nombre: document.getElementById('editClientName').value,
            email: document.getElementById('editClientEmail').value || null,
            telefono: document.getElementById('editClientPhone').value || null,
            direccion: document.getElementById('editClientAddress').value || null,
            limite_credito: parseFloat(document.getElementById('editClientLimit').value) || 0
        };

        try {
            const response = await fetch(`/api/clientes/${clientId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Error al actualizar cliente');
            }

            this.showSuccess('Cliente actualizado exitosamente');
            this.editModal.close();
            
            if (typeof loadClientes === 'function') {
                loadClientes();
            }
        } catch (error) {
            console.error('Error updating client:', error);
            this.showError('Error al actualizar el cliente');
        }
    }

    async deleteClient(clientId) {
        if (!confirm('¿Está seguro de eliminar este cliente?')) {
            return;
        }

        try {
            const response = await fetch(`/api/clientes/${clientId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Error al eliminar cliente');
            }

            this.showSuccess('Cliente eliminado exitosamente');
            
            if (typeof loadClientes === 'function') {
                loadClientes();
            }
        } catch (error) {
            console.error('Error deleting client:', error);
            this.showError('Error al eliminar el cliente');
        }
    }

    closeAddClientModal() { this.close(); }
    closeEditClientModal() { this.editModal.close(); }
    closeClientDebtsModal() { this.debtsModal.close(); }
}

function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof authCredentials !== 'undefined' && authCredentials) {
        headers['Authorization'] = 'Basic ' + btoa(authCredentials.username + ':' + authCredentials.password);
    }
    return headers;
}

window.addEventListener('DOMContentLoaded', () => {
    window.customerModal = new CustomerModal();
});
