/**
 * CajaModal - Handles cash register functionality
 */
class CajaModal extends Modal {
    constructor() {
        super('cierreModal', {
            closeOnOverlay: true,
            closeOnEscape: true
        });
        this.retroactiveModal = new Modal('retroactiveClosureModal', {
            closeOnOverlay: true,
            closeOnEscape: true
        });
    }

    async openCierreModal() {
        try {
            const response = await fetch('/api/cierres/actual', {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const currentCierre = await response.json();
                document.getElementById('cierreActualInfo').innerHTML = `
                    <p><strong>Fecha apertura:</strong> ${currentCierre.fecha_apertura}</p>
                    <p><strong>Total ventas:</strong> $${currentCierre.total_ventas?.toFixed(2) || '0.00'}</p>
                `;
            }
            
            this.open();
        } catch (error) {
            console.error('Error loading cierre data:', error);
            this.showError('Error al cargar los datos de cierre');
        }
    }

    async calculateCloseRegister() {
        try {
            const response = await fetch('/api/cierres/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                throw new Error('Error al calcular cierre');
            }

            const preview = await response.json();
            
            const previewContainer = document.getElementById('cierrePreview');
            if (previewContainer) {
                previewContainer.innerHTML = `
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <h4>Vista Previa del Cierre</h4>
                        <p><strong>Total Ventas:</strong> $${preview.total_ventas?.toFixed(2) || '0.00'}</p>
                        <p><strong>Ventas:</strong> ${preview.cantidad_ventas || 0}</p>
                    </div>
                `;
            }
            
            this.currentPreview = preview;
            
            const confirmBtn = document.getElementById('confirmCierreBtn');
            if (confirmBtn) {
                confirmBtn.style.display = 'inline-block';
            }
            
        } catch (error) {
            console.error('Error calculating cierre:', error);
            this.showError('Error al calcular el cierre');
        }
    }

    async confirmCierre() {
        if (!this.currentPreview) {
            this.showError('Primero calcule el cierre');
            return;
        }

        const montoCierre = parseFloat(document.getElementById('montoCierre')?.value) || 0;
        const observaciones = document.getElementById('cierreObservaciones')?.value || '';

        try {
            const response = await fetch('/api/cierres', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    monto_cierre: montoCierre,
                    observaciones: observaciones,
                    total_ventas: this.currentPreview.total_ventas,
                    cantidad_ventas: this.currentPreview.cantidad_ventas
                })
            });

            if (!response.ok) {
                throw new Error('Error al confirmar cierre');
            }

            this.showSuccess('Cierre de caja realizado exitosamente');
            this.close();
            this.currentPreview = null;
            
            if (typeof loadHistorialCierres === 'function') {
                loadHistorialCierres();
            }
            
        } catch (error) {
            console.error('Error confirming cierre:', error);
            this.showError('Error al confirmar el cierre');
        }
    }

    async showCierreDetails(cierreId) {
        try {
            const response = await fetch(`/api/cierres/${cierreId}`, {
                headers: getAuthHeaders()
            });
            const cierre = await response.json();
            
            const detailsHtml = `
                <div class="cierre-details-modal" style="
                    position: fixed; top: 0; left: 0;
                    width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex; align-items: center; justify-content: center; z-index: 10000;
                ">
                    <div style="background: white; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%;">
                        <h3>Detalles del Cierre</h3>
                        <p><strong>Total:</strong> $${cierre.total_ventas?.toFixed(2) || '0.00'}</p>
                        <p><strong>Ventas:</strong> ${cierre.cantidad_ventas || 0}</p>
                        <button onclick="this.closest('.cierre-details-modal').remove()" class="btn btn-secondary">Cerrar</button>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', detailsHtml);
            
        } catch (error) {
            console.error('Error loading cierre details:', error);
            this.showError('Error al cargar los detalles del cierre');
        }
    }

    closeCierreModal() { this.close(); }
    closeRetroactiveModal() { this.retroactiveModal.close(); }
}

function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof authCredentials !== 'undefined' && authCredentials) {
        headers['Authorization'] = 'Basic ' + btoa(authCredentials.username + ':' + authCredentials.password);
    }
    return headers;
}

window.addEventListener('DOMContentLoaded', () => {
    window.cajaModal = new CajaModal();
});
