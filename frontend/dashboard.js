
// Dashboard JavaScript functionality
// This file contains all the JavaScript code previously embedded in dashboard.html

// Mostrar loading inmediatamente al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    showLoadingOverlay();
});

// API_BASE ya está declarado en script.js
// isLoggedIn y authCredentials también están en script.js

function formatCurrency(amount) {
    return `$${parseFloat(amount).toFixed(2).replace('.', ',')}`;
}

function formatPaymentMethod(metodoPago, saleData) {
    if (Array.isArray(metodoPago) && metodoPago.length > 0) {
        if (metodoPago[0].metodo) {
            const paymentDetails = metodoPago.map(p => `${p.metodo.toUpperCase()}: ${formatCurrency(p.monto)}`).join(', ');
            const changeText = saleData && saleData.vuelto > 0 ? ` (Vuelto: ${formatCurrency(saleData.vuelto)})` : '';
            return paymentDetails + changeText;
        } else {
            return metodoPago.join('/');
        }
    } else if (typeof metodoPago === 'string') {
        const changeText = saleData && saleData.vuelto > 0 ? ` (Vuelto: ${formatCurrency(saleData.vuelto)})` : '';
        return metodoPago.toUpperCase() + changeText;
    }
    return 'No especificado';
}

function showAlert(message, type) {
    let alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 2000);
}

let globalProductosData = [];
let globalSuppliersData = [];
let currentSortMode = 1;
let quickOrderProducts = [];
let currentSupplierId = null;

// Variables para el estado de edición
let selectedProductId = null;

// Función para alternar entre modos de ordenamiento
function toggleSortMode() {
    if (globalProductosData.length === 0) {
        alert('No hay productos para ordenar');
        return;
    }

    // Cambiar al siguiente modo (0 -> 1 -> 2 -> 0...)
    currentSortMode = (currentSortMode + 1) % 3;

    // Aplicar el ordenamiento según el modo actual
    applySorting();

    // Actualizar el texto del botón
    updateSortButtonText();
}

// Función para aplicar el ordenamiento según el modo actual
function applySorting() {
    let sortedProductos = [...globalProductosData];

    switch (currentSortMode) {
        case 0: // Stock ascendente (menor a mayor)
            sortedProductos.sort((a, b) => a.stock - b.stock);
            break;
        case 1: // Stock descendente (mayor a menor)
            sortedProductos.sort((a, b) => b.stock - a.stock);
            break;
        case 2: // ID ascendente
            sortedProductos.sort((a, b) => a.id - b.id);
            break;
    }

    // Mostrar los datos ordenados
    displayTableData('productos', sortedProductos);
}

// Función para actualizar el texto del botón según el modo actual
function updateSortButtonText() {
    const sortBtn = document.getElementById('sortBtn');
    if (!sortBtn) return;

    switch (currentSortMode) {
        case 0:
            sortBtn.textContent = '📊 Stock ↑';
            break;
        case 1:
            sortBtn.textContent = '📊 Stock ↓';
            break;
        case 2:
            sortBtn.textContent = '🆔 ID ↑';
            break;
    }
}

// Función para mostrar ventas agrupadas por factura
function displaySalesGrouped(sales) {
    console.log('displaySalesGrouped called with:', sales);

    // Buscar el contenedor en la sección de ventas
    const container = document.querySelector('#ventas-container');
    const section = document.querySelector('#ventas-section');
    const loading = section ? section.querySelector('.loading') : null;

    console.log('Container found:', !!container);
    console.log('Section found:', !!section);
    console.log('Loading found:', !!loading);

    if (!container) {
        console.error('Ventas container not found!');
        return;
    }

    if (sales && sales.length > 0) {
        console.log('Displaying', sales.length, 'sales');

        // Asegurar que el contenedor sea visible
        container.style.display = 'block';

        // Ocultar loading si existe
        if (loading) {
            loading.style.display = 'none';
            console.log('Loading hidden');
        }

        // Generar HTML para las ventas
        const salesHTML = sales.map(sale => `
            <div class="invoice-card collapsed" style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; background: #fafafa;">
                <div class="invoice-header" style="border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 15px; position: relative;">
                    <span class="collapse-icon" onclick="toggleInvoice(this)" title="Expandir/Contraer" style="cursor: pointer; font-size: 18px; color: #666;">▶</span>
                    <h3 style="margin: 0; color: #2c3e50;">Factura: ${sale.numero_factura}</h3>
                    <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                        <span><strong>Fecha:</strong> ${new Date(sale.fecha).toLocaleString('es-AR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                        })}</span>
                        <span><strong>Pago:</strong> ${formatPaymentMethod(sale.metodo_pago, sale)}</span>
                        <span style="color: #27ae60; font-weight: bold;">Total: ${formatCurrency(sale.total)}</span>
                    </div>
                </div>

                <div class="invoice-items" style="margin-bottom: 15px;">
                    <h4 style="margin: 5px 0; color: #34495e;">Productos:</h4>
                    ${sale.items && sale.items.length > 0 ? `
                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                            <thead>
                                <tr style="background: #f8f9fa;">
                                    <th style="padding: 8px; text-align: left; border: 1px solid #ddd; font-weight: bold; font-size: 0.9em;">Producto</th>
                                    <th style="padding: 8px; text-align: center; border: 1px solid #ddd; font-weight: bold; font-size: 0.9em;">Cant</th>
                                    <th style="padding: 8px; text-align: center; border: 1px solid #ddd; font-weight: bold; font-size: 0.9em;">Precio Unitario</th>
                                    <th style="padding: 8px; text-align: center; border: 1px solid #ddd; font-weight: bold; font-size: 0.9em;">Tipo</th>
                                    <th style="padding: 8px; text-align: right; border: 1px solid #ddd; font-weight: bold; font-size: 0.9em;">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sale.items.map(item => {
                                    const descuentoPorcentaje = parseFloat(item.descuento_porcentaje || 0);
                                    const hasDiscount = descuentoPorcentaje > 0;
                                    const precioOriginal = parseFloat(item.precio_original || item.precio_unitario);
                                    const precioUnitario = parseFloat(item.precio_unitario);
                                    const cantidad = item.cantidad || 0;
                                    const subtotal = precioUnitario * cantidad;

                                    console.log('Item discount check:', item.nombre, 'descuento_porcentaje:', item.descuento_porcentaje, 'hasDiscount:', hasDiscount);

                                    let precioDisplay = '';
                                    let tipoDisplay = '';

                                    if (hasDiscount) {
                                        precioDisplay = `<span style="text-decoration: line-through; color: #7f8c8d; margin-right: 5px;">${formatCurrency(precioOriginal)}</span><span style="color: #e74c3c; font-weight: bold;">${formatCurrency(precioUnitario)}</span>`;
                                        tipoDisplay = `<span style="background: #e74c3c; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.8em; font-weight: bold;">${descuentoPorcentaje}% OFF</span>`;
                                    } else {
                                        precioDisplay = `<span style="color: #27ae60; font-weight: bold;">${formatCurrency(precioUnitario)}</span>`;
                                        tipoDisplay = `<span style="background: #27ae60; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.8em; font-weight: bold;">Regular</span>`;
                                    }

                                    return `
                                        <tr style="${hasDiscount ? 'background: linear-gradient(90deg, #fff5f5 0%, #ffffff 100%);' : 'background: #f9f9f9;'}">
                                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${item.nombre || 'Producto desconocido'}</td>
                                            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${cantidad}</td>
                                            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${precioDisplay}</td>
                                            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${tipoDisplay}</td>
                                            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; ${hasDiscount ? 'color: #e74c3c;' : 'color: #27ae60;'}">${formatCurrency(subtotal)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    ` : '<div style="padding: 10px; color: #666;">No hay productos en esta venta</div>'}
                </div>

                <div class="invoice-total" style="text-align: right; font-size: 18px; font-weight: bold; color: #27ae60; border-top: 2px solid #bdc3c7; padding-top: 10px;">
                    Total: ${formatCurrency(sale.total || 0)}
                    <button class="btn btn-secondary" style="margin-left: 10px; background: #dc3545; color: white; font-size: 12px; padding: 5px 10px;" onclick="cancelSale(${sale.id}, '${sale.numero_factura}')">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        `).join('');

        console.log('Generated HTML length:', salesHTML.length);
        console.log('Generated HTML preview:', salesHTML.substring(0, 200) + '...');
        container.innerHTML = salesHTML;
        console.log('HTML set to container');

    } else {
        console.log('No sales to display');
        container.style.display = 'none';
        if (loading) {
            loading.textContent = 'No hay ventas registradas.';
            loading.style.display = 'block';
        }

    }
}

// Función para expandir/contraer facturas
function toggleInvoice(iconElement) {
    const invoiceCard = iconElement.closest('.invoice-card');
    invoiceCard.classList.toggle('collapsed');

    // Cambiar el icono
    if (invoiceCard.classList.contains('collapsed')) {
        iconElement.textContent = '▶';
    } else {
        iconElement.textContent = '▼';
    }
}

// Función para filtrar ventas por fecha
async function filterSales() {
    const date = document.getElementById('sales-date').value;
    const startDate = document.getElementById('sales-start-date').value;
    const endDate = document.getElementById('sales-end-date').value;

    let url = `${API_BASE}/sales`;

    // Construir parámetros de consulta
    const params = [];
    if (date) {
        params.push(`date=${date}`);
    } else if (startDate && endDate) {
        params.push(`start_date=${startDate}&end_date=${endDate}`);
    } else if (startDate) {
        params.push(`start_date=${startDate}`);
    } else if (endDate) {
        params.push(`end_date=${endDate}`);
    }

    if (params.length > 0) {
        url += '?' + params.join('&');
    }

    const headers = { 'Content-Type': 'application/json' };
    if (authCredentials) {
        headers['Authorization'] = 'Basic ' + btoa(authCredentials.username + ':' + authCredentials.password);
    }

    try {
        showAlert('Cargando ventas filtradas...', 'success');
        const response = await fetch(url, { headers });

        if (response.status === 401) {
            isLoggedIn = false;
            updateUIBasedOnAuth();
            throw new Error('Autenticación requerida');
        }

        if (!response.ok) throw new Error('Error al filtrar ventas');

        const ventas = await response.json();
        displaySalesGrouped(ventas);
        showAlert('Ventas filtradas exitosamente', 'success');

    } catch (error) {
        console.error('Error filtering sales:', error);
        showAlert('Error al filtrar ventas: ' + error.message, 'error');
    }
}

// Función para limpiar filtros y mostrar todas las ventas
async function clearSalesFilter() {
    document.getElementById('sales-date').value = '';
    document.getElementById('sales-start-date').value = '';
    document.getElementById('sales-end-date').value = '';

    // Recargar ventas por defecto (hoy)
    await fetchAndDisplayData();
    showAlert('Filtros limpiados - mostrando ventas de hoy', 'success');
}

// Función para mostrar ventas de hoy
async function showTodaySales() {
    document.getElementById('sales-date').value = '';
    document.getElementById('sales-start-date').value = '';
    document.getElementById('sales-end-date').value = '';

    // Recargar ventas por defecto (hoy)
    await fetchAndDisplayData();
    showAlert('Mostrando ventas de hoy', 'success');
}

// Función para cancelar una venta
async function cancelSale(saleId, numeroFactura) {
    if (!confirm(`¿Está seguro de que desea cancelar la venta ${numeroFactura}?\n\nEsta acción no se puede deshacer y restaurará el stock de los productos.`)) {
        return;
    }

    // Pedir credenciales para cancelar venta
    const username = prompt('Usuario:');
    const password = prompt('Contraseña:');
    if (!username || !password) {
        alert('Credenciales requeridas para cancelar la venta');
        return;
    }

    const headers = { 'Content-Type': 'application/json' };
    headers['Authorization'] = 'Basic ' + btoa(username + ':' + password);

    try {
        showAlert('Cancelando venta...', 'success');

        const response = await fetch(`${API_BASE}/sales/${saleId}`, {
            method: 'DELETE',
            headers: headers
        });

        if (response.status === 401) {
            isLoggedIn = false;
            updateUIBasedOnAuth();
            throw new Error('Autenticación requerida');
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al cancelar la venta');
        }

        const result = await response.json();
        showAlert(result.message || 'Venta cancelada exitosamente', 'success');

        // Recargar las ventas para actualizar la vista
        await fetchAndDisplayData();

    } catch (error) {
        console.error('Error cancelando venta:', error);
        showAlert('Error al cancelar la venta: ' + error.message, 'error');
    }
}

// Funciones de autenticación
function login() {
    const username = prompt('Usuario:');
    const password = prompt('Contraseña:');

    if (username && password) {
        authCredentials = { username, password };
        isLoggedIn = true;
        sessionStorage.setItem('authCredentials', JSON.stringify(authCredentials));
        updateUIBasedOnAuth();
        alert('✅ Sesión iniciada correctamente');
        fetchAndDisplayData(); // Recargar datos después del login
    }
}

function logout() {
    authCredentials = null;
    isLoggedIn = false;
    sessionStorage.removeItem('authCredentials');
    updateUIBasedOnAuth();
    alert('👋 Sesión cerrada');
    // Redirigir al inicio si se cierra sesión desde dashboard
    window.location.href = 'index.html';
}

function updateUIBasedOnAuth() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.textContent = isLoggedIn ? 'Cerrar Sesión' : 'Iniciar Sesión';
        loginBtn.onclick = isLoggedIn ? logout : login;
    }
}

// Verificar autenticación al cargar dashboard
function checkDashboardAccess() {
    if (!isLoggedIn) {
        alert('Debes iniciar sesión para acceder al Panel de Control');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Cargar y mostrar estado de licencia
async function loadLicenseStatus() {
    try {
        const response = await fetch(`${API_BASE}/license-status`);
        const data = await response.json();

        const indicator = document.getElementById('license-indicator');

        if (data.activated) {
            indicator.innerHTML = '<span style="color: #28a745;">✅ Licencia Activada - Características Premium Disponibles</span>';
        } else {
            indicator.innerHTML = '<span style="color: #dc3545;">⚠️ Sin Licencia - Características Limitadas</span>';
        }
    } catch (error) {
        console.error('Error loading license status:', error);
        document.getElementById('license-indicator').innerHTML = '<span style="color: #ffc107;">⚠️ Error al cargar estado de licencia</span>';
    }
}

// Cargar credenciales al iniciar
function loadAuthFromStorage() {
    const stored = sessionStorage.getItem('authCredentials');
    if (stored) {
        authCredentials = JSON.parse(stored);
        isLoggedIn = true;
    }
    // updateUIBasedOnAuth() will be called after DOMContentLoaded
}

// Función para ejecutar acción de datos seleccionada
function executeDataAction() {
    const action = document.getElementById('dataActionSelect').value;
    switch(action) {
        case 'backup':
            createBackup();
            break;
        case 'restore':
            document.getElementById('backupFileInput').click();
            break;
        case 'report':
            generateReport();
            break;
        case 'reset':
            resetData();
            break;
        default:
            alert('Selecciona una acción válida');
    }
}

// Función para ejecutar acción del sistema seleccionada
function executeSystemAction() {
    const action = document.getElementById('systemActionSelect').value;
    switch(action) {
        case 'support':
            showSupportModal();
            break;
        case 'session':
            if (isLoggedIn) {
                logout();
            } else {
                login();
            }
            break;
        case 'license':
            loadLicenseStatus();
            alert('Estado de licencia actualizado');
            break;
        case 'settings':
            alert('Configuraciones del sistema - Funcionalidad próximamente');
            break;
        default:
            alert('Selecciona una acción válida');
    }
}

// Función para generar reporte y enviar por email
async function generateReport() {
    // Pedir credenciales siempre para esta operación crítica
    const username = prompt('Usuario:');
    const password = prompt('Contraseña:');
    if (!username || !password) {
        alert('Credenciales requeridas para generar el reporte');
        return;
    }
    const tempCredentials = { username, password };

    // Mostrar modal de opciones de reporte
    document.getElementById('reportOptionsModal').classList.add('show');
}

// Función para cerrar modal de opciones de reporte
function closeReportOptionsModal() {
    document.getElementById('reportOptionsModal').classList.remove('show');
}

// Función para mostrar modal de soporte
function showSupportModal() {
    document.getElementById('supportModal').classList.add('show');
}

// Función para cerrar modal de soporte
function closeSupportModal() {
    document.getElementById('supportModal').classList.remove('show');
}

// Función para contactar soporte
function contactSupport() {
    // Abrir email client con asunto predefinido
    const subject = encodeURIComponent('Soporte Técnico - Sistema POS');
    const body = encodeURIComponent('Hola,\n\nNecesito ayuda con el Sistema POS.\n\nDescripción del problema:\n\n');
    const mailtoUrl = `mailto:mikhail.njr@gmail.com?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_blank');

    // También mostrar mensaje de confirmación
    alert('Se abrió tu cliente de email. Si no se abre automáticamente, puedes contactarnos directamente a: mikhail.njr@gmail.com o +543434721177');

    closeSupportModal();
}

// Función para cerrar modal de opciones de reset
function closeResetOptionsModal() {
    document.getElementById('resetOptionsModal').classList.remove('show');
}

// Función para seleccionar todas las secciones de reset
function selectAllResetSections() {
    document.getElementById('resetVentas').checked = true;
    document.getElementById('resetCierres').checked = true;
    document.getElementById('resetProveedores').checked = true;
    document.getElementById('resetPromociones').checked = true;
    document.getElementById('resetLog').checked = true;
    document.getElementById('resetMetricas').checked = true;
}

// Función para deseleccionar todas las secciones de reset
function deselectAllResetSections() {
    document.getElementById('resetVentas').checked = false;
    document.getElementById('resetCierres').checked = false;
    document.getElementById('resetProveedores').checked = false;
    document.getElementById('resetPromociones').checked = false;
    document.getElementById('resetLog').checked = false;
    document.getElementById('resetMetricas').checked = false;
}

// Función para seleccionar todas las secciones
function selectAllSections() {
    document.getElementById('includeFacturas').checked = true;
    document.getElementById('includeCierres').checked = true;
    document.getElementById('includeProductos').checked = true;
    document.getElementById('includeProveedores').checked = true;
}

// Función para deseleccionar todas las secciones
function deselectAllSections() {
    document.getElementById('includeFacturas').checked = false;
    document.getElementById('includeCierres').checked = false;
    document.getElementById('includeProductos').checked = false;
    document.getElementById('includeProveedores').checked = false;
}

// Función para generar reporte con secciones seleccionadas
async function generateSelectedReport() {
    // Verificar si tiene licencia para generar reportes
    try {
        const licenseResponse = await fetch(`${API_BASE}/can-generate-reports`);
        const licenseData = await licenseResponse.json();

        if (!licenseData.canGenerate) {
            const activate = confirm(licenseData.message + '\n\n¿Deseas activar una licencia ahora?');
            if (activate) {
                window.open('/activate', '_blank');
            }
            closeReportOptionsModal();
            return;
        }
    } catch (error) {
        console.error('Error checking license for reports:', error);
        alert('Error al verificar permisos para reportes');
        closeReportOptionsModal();
        return;
    }

    // Obtener credenciales (ya verificadas en generateReport)
    let tempCredentials = authCredentials;
    if (!tempCredentials) {
        const username = prompt('Usuario:');
        const password = prompt('Contraseña:');
        if (username && password) {
            tempCredentials = { username, password };
        } else {
            alert('Credenciales requeridas para generar el reporte');
            return;
        }
    }

    // Pedir email
    const email = prompt('Ingrese el correo electrónico del destinatario:');
    if (!email || !email.includes('@')) {
        alert('Correo electrónico inválido');
        return;
    }

    // Pedir fecha opcional
    const dateInput = prompt('Ingrese la fecha (YYYY-MM-DD) o deje vacío para toda la información:');
    let filterDate = null;
    if (dateInput && dateInput.trim()) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
            alert('Formato de fecha inválido. Use YYYY-MM-DD');
            return;
        }
        filterDate = dateInput.trim();
    }

    // Obtener secciones seleccionadas
    const includeFacturas = document.getElementById('includeFacturas').checked;
    const includeCierres = document.getElementById('includeCierres').checked;
    const includeProductos = document.getElementById('includeProductos').checked;
    const includeProveedores = document.getElementById('includeProveedores').checked;

    // Cerrar modal
    closeReportOptionsModal();

    // Headers para autenticación
    const headers = { 'Content-Type': 'application/json' };
    if (tempCredentials) {
        headers['Authorization'] = 'Basic ' + btoa(tempCredentials.username + ':' + tempCredentials.password);
    }

    try {
        // Mostrar loading
        showAlert('Generando reporte...', 'success');

        // Fetch ventas
        const salesRes = await fetch(`${API_BASE}/sales`, { headers });
        if (!salesRes.ok) throw new Error('Error al obtener ventas');
        let sales = await salesRes.json();

        // Filtrar por fecha si se especificó
        if (filterDate) {
            sales = sales.filter(sale => sale.fecha.startsWith(filterDate));
        }

        // Fetch productos
        const productsRes = await fetch(`${API_BASE}/products`, { headers });
        if (!productsRes.ok) throw new Error('Error al obtener productos');
        const products = await productsRes.json();

        // Calcular total de unidades en stock
        const totalStock = products.reduce((sum, product) => sum + product.stock, 0);

        // Fetch proveedores (opcional)
        let suppliers = [];
        try {
            const suppliersRes = await fetch(`${API_BASE}/suppliers`, { headers });
            if (suppliersRes.ok) {
                suppliers = await suppliersRes.json();
            }
        } catch (e) {
            console.log('Proveedores no disponibles');
        }

        // Fetch cierres de caja
        const cierresRes = await fetch(`${API_BASE}/cierres`, { headers });
        if (!cierresRes.ok) throw new Error('Error al obtener cierres de caja');
        const cierres = await cierresRes.json();

        // Generar PDF con mejor formato
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Configuración de página
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        let y = 30;

        // Título principal
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE ESTADO DEL COMERCIO', pageWidth / 2, y, { align: 'center' });
        y += 15;

        // Línea separadora
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        // Fecha del reporte
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha del reporte: ${new Date().toLocaleDateString('es-AR')}`, margin, y);
        y += 10;

        if (filterDate) {
            doc.text(`Datos filtrados por fecha: ${filterDate}`, margin, y);
            y += 15;
        }

        // ==========================================
        // SECCIÓN 1: RESUMEN GENERAL
        // ==========================================
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMEN GENERAL', margin, y);
        y += 8;
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // Total productos
        doc.text(`Productos en stock: ${totalStock} unidades`, margin, y);
        y += 8;

        // Resumen de ventas
        const totalSales = sales.reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0);
        doc.text(`Total de ventas realizadas: ${sales.length}`, margin, y);
        y += 8;
        doc.text(`Monto total de ventas: ${formatCurrency(totalSales)}`, margin, y);
        y += 15;

        // ==========================================
        // SECCIÓN 2: DETALLE DE VENTAS
        // ==========================================
        if (includeFacturas && sales.length > 0) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('DETALLE DE VENTAS', margin, y);
            y += 8;
            doc.setLineWidth(0.3);
            doc.line(margin, y, pageWidth - margin, y);
            y += 10;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');

            sales.forEach((sale, index) => {
                if (y > 250) {
                    doc.addPage();
                    y = 30;
                }

                // Encabezado de factura (formato profesional)
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(`FACTURA: ${sale.numero_factura}`, margin, y);
                y += 8;

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text(`Fecha: ${new Date(sale.fecha).toLocaleDateString('es-AR')}`, margin, y);
                doc.text(`Hora: ${new Date(sale.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`, 80, y);

                // Método de pago
                let metodoPago = 'No especificado';
                if (Array.isArray(sale.metodo_pago) && sale.metodo_pago.length > 0) {
                    if (sale.metodo_pago[0].metodo) {
                        metodoPago = sale.metodo_pago.map(p => `${p.metodo.toUpperCase()}: ${formatCurrency(p.monto)}`).join(' + ');
                    }
                } else if (typeof sale.metodo_pago === 'string') {
                    metodoPago = sale.metodo_pago.toUpperCase();
                }
                doc.text(`Pago: ${metodoPago}`, 140, y);
                y += 8;

                // Línea separadora del encabezado
                doc.setLineWidth(0.3);
                doc.line(margin, y, pageWidth - margin, y);
                y += 5;

                // Items de la venta - Formato de tabla estructurada
                if (sale.items && sale.items.length > 0) {
                    // Título de la sección de productos
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text('DETALLE DE PRODUCTOS', margin, y);
                    y += 6;

                    // Encabezados de tabla
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Producto', margin + 5, y);
                    doc.text('Cant', 100, y);
                    doc.text('Precio Unit.', 120, y);
                    doc.text('Tipo', 160, y);
                    doc.text('Subtotal', 185, y);
                    y += 4;

                    // Línea separadora
                    doc.setLineWidth(0.2);
                    doc.line(margin + 5, y, pageWidth - margin, y);
                    y += 3;

                    doc.setFont('helvetica', 'normal');

                    sale.items.forEach(item => {
                        if (y > 270) {
                            doc.addPage();
                            y = 30;
                            // Repetir encabezados en nueva página
                            doc.setFontSize(8);
                            doc.setFont('helvetica', 'bold');
                            doc.text('Producto', margin + 5, y);
                            doc.text('Cant', 100, y);
                            doc.text('Precio Unit.', 120, y);
                            doc.text('Tipo', 160, y);
                            doc.text('Subtotal', 185, y);
                            y += 4;
                            doc.line(margin + 5, y, pageWidth - margin, y);
                            y += 3;
                            doc.setFont('helvetica', 'normal');
                        }

                        const precioOriginal = parseFloat(item.precio_original || item.precio_unitario);
                        const precioUnitario = parseFloat(item.precio_unitario);
                        const descuento = parseFloat(item.descuento_porcentaje || 0);
                        const subtotal = precioUnitario * item.cantidad;

                        // Nombre del producto (truncar si es muy largo)
                        const productName = item.nombre.length > 20 ? item.nombre.substring(0, 17) + '...' : item.nombre;
                        doc.text(productName, margin + 5, y);

                        // Cantidad
                        doc.text(item.cantidad.toString(), 100, y);

                        // Precio unitario
                        if (descuento > 0) {
                            // Mostrar precio original tachado y precio con descuento
                            doc.setFontSize(7);
                            doc.text(`${formatCurrency(precioOriginal)}`, 120, y - 1);
                            doc.setLineWidth(0.1);
                            doc.line(120, y, 120 + doc.getTextWidth(formatCurrency(precioOriginal)), y);
                            doc.setFontSize(8);
                            doc.setFont('helvetica', 'bold');
                            doc.text(`${formatCurrency(precioUnitario)}`, 120, y + 2);
                            doc.setFont('helvetica', 'normal');
                        } else {
                            doc.text(formatCurrency(precioUnitario), 120, y);
                        }

                        // Tipo (Regular o % OFF)
                        if (descuento > 0) {
                            doc.setFont('helvetica', 'bold');
                            doc.text(`${descuento}% OFF`, 160, y);
                            doc.setFont('helvetica', 'normal');
                        } else {
                            doc.setFontSize(7);
                            doc.text('Regular', 160, y);
                            doc.setFontSize(8);
                        }

                        // Subtotal
                        doc.setFont('helvetica', 'bold');
                        doc.text(formatCurrency(subtotal), 185, y);
                        doc.setFont('helvetica', 'normal');

                        y += 6;
                    });

                    // Línea final de la tabla
                    doc.setLineWidth(0.3);
                    doc.line(margin + 5, y, pageWidth - margin, y);
                    y += 8;
                }
                y += 5;

                // Total de la factura (formato profesional)
                if (y > 250) {
                    doc.addPage();
                    y = 30;
                }

                // Espacio antes del total
                y += 3;

                // Línea separadora
                doc.setLineWidth(0.5);
                doc.line(130, y, pageWidth - margin, y);
                y += 10;

                // Total de la factura
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('TOTAL FACTURA:', 130, y);
                doc.text(formatCurrency(sale.total), pageWidth - margin, y, { align: 'right' });
                y += 12;

                // Espacio entre facturas
                y += 10;
            });
            y += 5;
        }

        // ==========================================
        // SECCIÓN 3: CIERRES DE CAJA
        // ==========================================
        if (includeCierres && cierres.length > 0) {
            if (y > 150) {
                doc.addPage();
                y = 30;
            }

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('CIERRES DE CAJA', margin, y);
            y += 8;
            doc.setLineWidth(0.3);
            doc.line(margin, y, pageWidth - margin, y);
            y += 10;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');

            cierres.forEach(cierre => {
                if (y > 250) {
                    doc.addPage();
                    y = 30;
                }

                doc.setFont('helvetica', 'bold');
                doc.text(`Fecha: ${new Date(cierre.fecha).toLocaleDateString('es-AR')}`, margin, y);
                y += 6;
                doc.setFont('helvetica', 'normal');

                doc.text(`Dinero inicial: ${formatCurrency(cierre.dinero_inicial)}`, margin + 5, y);
                y += 5;
                doc.text(`Total ventas: ${formatCurrency(cierre.total_ventas)}`, margin + 5, y);
                y += 5;
                doc.text(`Total esperado: ${formatCurrency(cierre.total_esperado)}`, margin + 5, y);
                y += 5;
                doc.text(`Diferencia: ${formatCurrency(cierre.diferencia)}`, margin + 5, y);
                y += 5;
                doc.text(`Cantidad de ventas: ${cierre.cantidad_ventas}`, margin + 5, y);
                y += 8;
            });
        }

        // ==========================================
        // SECCIÓN 4: PRODUCTOS DISPONIBLES
        // ==========================================
        if (includeProductos) {
            if (y > 200) {
                doc.addPage();
                y = 30;
            }

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('PRODUCTOS DISPONIBLES', margin, y);
            y += 8;
            doc.setLineWidth(0.3);
            doc.line(margin, y, pageWidth - margin, y);
            y += 10;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');

            products.forEach(product => {
                if (y > 270) {
                    doc.addPage();
                    y = 30;
                }

                const hasDiscount = product.descuento_porcentaje && product.descuento_porcentaje > 0;
                let productLine = `${product.nombre}`;
                if (hasDiscount) {
                    productLine += ` (${product.descuento_porcentaje}% OFF)`;
                }

                doc.text(productLine, margin, y);
                doc.text(`Stock: ${product.stock}`, 120, y);
                doc.text(`Precio: ${formatCurrency(product.precio)}`, 160, y);
                y += 6;
            });
            y += 10;
        }

        // ==========================================
        // SECCIÓN 5: PROVEEDORES
        // ==========================================
        if (includeProveedores && suppliers.length > 0) {
            if (y > 200) {
                doc.addPage();
                y = 30;
            }

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('PROVEEDORES', margin, y);
            y += 8;
            doc.setLineWidth(0.3);
            doc.line(margin, y, pageWidth - margin, y);
            y += 10;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');

            suppliers.forEach(supplier => {
                if (y > 270) {
                    doc.addPage();
                    y = 30;
                }

                doc.text(`${supplier.nombre_proveedor}`, margin, y);
                if (supplier.nombre_contacto) {
                    doc.text(`Contacto: ${supplier.nombre_contacto}`, margin + 5, y + 5);
                }
                if (supplier.telefono) {
                    doc.text(`Teléfono: ${supplier.telefono}`, 120, y);
                }
                if (supplier.email) {
                    doc.text(`Email: ${supplier.email}`, 120, y + 5);
                }
                y += 15;
            });
        }

        // Descargar PDF
        doc.save('reporte_comercio.pdf');

        // Abrir Gmail
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent('Reporte de Estado del Comercio')}&body=${encodeURIComponent('Adjunto el reporte del estado del comercio.')}`;
        window.open(gmailUrl, '_blank');

        showAlert('Reporte generado y Gmail abierto. Adjunte el PDF descargado al email.', 'success');

    } catch (error) {
        console.error('Error generando reporte:', error);
        showAlert('Error al generar el reporte: ' + error.message, 'error');
    }
}

// Función para ocultar el loading overlay
function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Función para mostrar el loading overlay
function showLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

// Función para inicializar todos los event listeners de botones
function initializeButtonEventListeners() {
    // Event listeners para filtros de ventas
    const filterBtn = document.getElementById('filter-sales-btn');
    if (filterBtn) filterBtn.addEventListener('click', filterSales);

    const clearFilterBtn = document.getElementById('clear-filter-btn');
    if (clearFilterBtn) clearFilterBtn.addEventListener('click', clearSalesFilter);

    const todaySalesBtn = document.getElementById('today-sales-btn');
    if (todaySalesBtn) todaySalesBtn.addEventListener('click', showTodaySales);

    // Permitir filtrar con Enter en los campos de fecha
    const salesDate = document.getElementById('sales-date');
    if (salesDate) salesDate.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') filterSales();
    });

    const salesStartDate = document.getElementById('sales-start-date');
    if (salesStartDate) salesStartDate.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') filterSales();
    });

    const salesEndDate = document.getElementById('sales-end-date');
    if (salesEndDate) salesEndDate.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') filterSales();
    });

    // Event listeners para dropdowns de acciones
    const dataActionSelect = document.getElementById('dataActionSelect');
    if (dataActionSelect) dataActionSelect.addEventListener('change', function() {
        const btn = document.getElementById('executeDataActionBtn');
        if (btn) btn.disabled = !this.value;
    });

    const systemActionSelect = document.getElementById('systemActionSelect');
    if (systemActionSelect) systemActionSelect.addEventListener('change', function() {
        const btn = document.getElementById('executeSystemActionBtn');
        if (btn) btn.disabled = !this.value;
    });

    // Event listeners para checkboxes de productos
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('product-checkbox')) {
            // Para selección única, desmarcar otros
            if (e.target.checked) {
                document.querySelectorAll('.product-checkbox').forEach(cb => {
                    if (cb !== e.target) cb.checked = false;
                });
            }
            updateEditButton();
        }
    });

    // Event listener para el botón editar
    const editSelectedBtn = document.getElementById('editSelectedBtn');
    if (editSelectedBtn) editSelectedBtn.addEventListener('click', function() {
        const checkedBox = document.querySelector('.product-checkbox:checked');
        if (checkedBox) {
            const productId = checkedBox.getAttribute('data-product-id');
            editProduct(productId);
        }
    });

    // Event listener para el botón "Cierre de Caja"
    const closeRegisterBtn = document.getElementById('closeRegisterBtn');
    if (closeRegisterBtn) closeRegisterBtn.addEventListener('click', function() {
        document.getElementById('cierreModal').classList.add('show');
    });

    // Event listener para el botón "Ir a Caja"
    const returnToPOSBtn = document.getElementById('returnToPOSBtn');
    if (returnToPOSBtn) returnToPOSBtn.addEventListener('click', returnToPOS);

    // Event listeners para botones de acciones de datos
    const executeDataActionBtn = document.getElementById('executeDataActionBtn');
    if (executeDataActionBtn) executeDataActionBtn.addEventListener('click', executeDataAction);

    const executeSystemActionBtn = document.getElementById('executeSystemActionBtn');
    if (executeSystemActionBtn) executeSystemActionBtn.addEventListener('click', executeSystemAction);

    // Event listeners para botones de cierre de caja
    const calculateCloseRegisterBtn = document.getElementById('calculateCloseRegisterBtn');
    if (calculateCloseRegisterBtn) calculateCloseRegisterBtn.addEventListener('click', calculateCloseRegister);

    const closeCierreModalBtn = document.getElementById('closeCierreModalBtn');
    if (closeCierreModalBtn) closeCierreModalBtn.addEventListener('click', closeCierreModal);

    // Event listeners para botones de promociones
    const openCreatePromotionModalBtn = document.getElementById('openCreatePromotionModalBtn');
    if (openCreatePromotionModalBtn) openCreatePromotionModalBtn.addEventListener('click', openCreatePromotionModal);

    const cleanDuplicatePromotionsBtn = document.getElementById('cleanDuplicatePromotionsBtn');
    if (cleanDuplicatePromotionsBtn) cleanDuplicatePromotionsBtn.addEventListener('click', cleanDuplicatePromotions);

    // Event listeners para botones de productos
    const openAddProductModalBtn = document.getElementById('openAddProductModalBtn');
    if (openAddProductModalBtn) openAddProductModalBtn.addEventListener('click', openAddProductModal);

    const openQuickOrderModalBtn = document.getElementById('openQuickOrderModalBtn');
    if (openQuickOrderModalBtn) openQuickOrderModalBtn.addEventListener('click', openQuickOrderModal);

    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.addEventListener('click', function() {
        alert('Usa Ctrl+F para buscar en la página');
    });

    const sortBtn = document.getElementById('sortBtn');
    if (sortBtn) sortBtn.addEventListener('click', toggleSortMode);

    // Event listeners para botones de proveedores
    const openAddSupplierModalBtn = document.getElementById('openAddSupplierModalBtn');
    if (openAddSupplierModalBtn) openAddSupplierModalBtn.addEventListener('click', openAddSupplierModal);

    const openAddProductsToSupplierModalBtn = document.getElementById('openAddProductsToSupplierModalBtn');
    if (openAddProductsToSupplierModalBtn) openAddProductsToSupplierModalBtn.addEventListener('click', openAddProductsToSupplierModal);

    const clearSupplierProductListBtn = document.getElementById('clearSupplierProductListBtn');
    if (clearSupplierProductListBtn) clearSupplierProductListBtn.addEventListener('click', clearSupplierProductList);

    // Event listeners para botones de órdenes de compra
    const openCreatePurchaseOrderModalBtn = document.getElementById('openCreatePurchaseOrderModalBtn');
    if (openCreatePurchaseOrderModalBtn) openCreatePurchaseOrderModalBtn.addEventListener('click', openCreatePurchaseOrderModal);

    const loadPurchaseOrdersBtn = document.getElementById('loadPurchaseOrdersBtn');
    if (loadPurchaseOrdersBtn) loadPurchaseOrdersBtn.addEventListener('click', loadPurchaseOrders);

    // Event listeners para botones de registro de operaciones
    const loadOperationsLogBtn = document.getElementById('loadOperationsLogBtn');
    if (loadOperationsLogBtn) loadOperationsLogBtn.addEventListener('click', loadOperationsLog);

    const clearOperationsLogBtn = document.getElementById('clearOperationsLogBtn');
    if (clearOperationsLogBtn) clearOperationsLogBtn.addEventListener('click', clearOperationsLog);

    // Event listeners para botones de modales de edición
    const closeEditModalBtn = document.getElementById('closeEditModalBtn');
    if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', closeEditModal);

    const closeAddModalBtn = document.getElementById('closeAddModalBtn');
    if (closeAddModalBtn) closeAddModalBtn.addEventListener('click', closeAddModal);

    const closeAddSupplierModalBtn = document.getElementById('closeAddSupplierModalBtn');
    if (closeAddSupplierModalBtn) closeAddSupplierModalBtn.addEventListener('click', closeAddSupplierModal);

    const closeEditSupplierModalBtn = document.getElementById('closeEditSupplierModalBtn');
    if (closeEditSupplierModalBtn) closeEditSupplierModalBtn.addEventListener('click', closeEditSupplierModal);

    const closeCreateSupplierOrderModalBtn = document.getElementById('closeCreateSupplierOrderModalBtn');
    if (closeCreateSupplierOrderModalBtn) closeCreateSupplierOrderModalBtn.addEventListener('click', closeCreateSupplierOrderModal);

    const closePurchaseOrderDetailsModalBtn = document.getElementById('closePurchaseOrderDetailsModalBtn');
    if (closePurchaseOrderDetailsModalBtn) closePurchaseOrderDetailsModalBtn.addEventListener('click', closePurchaseOrderDetailsModal);

    const updateOrderStatusBtn = document.getElementById('updateOrderStatusBtn');
    if (updateOrderStatusBtn) updateOrderStatusBtn.addEventListener('click', updateOrderStatus);

    const closeCreatePromotionModalBtn = document.getElementById('closeCreatePromotionModalBtn');
    if (closeCreatePromotionModalBtn) closeCreatePromotionModalBtn.addEventListener('click', closeCreatePromotionModal);

    // Event listeners para botones de reportes
    const selectAllSectionsBtn = document.getElementById('selectAllSectionsBtn');
    if (selectAllSectionsBtn) selectAllSectionsBtn.addEventListener('click', selectAllSections);

    const deselectAllSectionsBtn = document.getElementById('deselectAllSectionsBtn');
    if (deselectAllSectionsBtn) deselectAllSectionsBtn.addEventListener('click', deselectAllSections);

    const closeReportOptionsModalBtn = document.getElementById('closeReportOptionsModalBtn');
    if (closeReportOptionsModalBtn) closeReportOptionsModalBtn.addEventListener('click', closeReportOptionsModal);

    const generateSelectedReportBtn = document.getElementById('generateSelectedReportBtn');
    if (generateSelectedReportBtn) generateSelectedReportBtn.addEventListener('click', generateSelectedReport);

    // Event listeners para botones de soporte
    const closeSupportModalBtn = document.getElementById('closeSupportModalBtn');
    if (closeSupportModalBtn) closeSupportModalBtn.addEventListener('click', closeSupportModal);

    const contactSupportBtn = document.getElementById('contactSupportBtn');
    if (contactSupportBtn) contactSupportBtn.addEventListener('click', contactSupport);

    // Event listeners para botones de orden rápida
    const closeQuickOrderModalBtn = document.getElementById('closeQuickOrderModalBtn');
    if (closeQuickOrderModalBtn) closeQuickOrderModalBtn.addEventListener('click', closeQuickOrderModal);

    const createQuickOrderBtn = document.getElementById('createQuickOrderBtn');
    if (createQuickOrderBtn) createQuickOrderBtn.addEventListener('click', createQuickOrder);

    // Event listeners para botones de agregar productos a proveedor
    const closeAddProductsToSupplierModalBtn = document.getElementById('closeAddProductsToSupplierModalBtn');
    if (closeAddProductsToSupplierModalBtn) closeAddProductsToSupplierModalBtn.addEventListener('click', closeAddProductsToSupplierModal);

    const saveSupplierProductListBtn = document.getElementById('saveSupplierProductListBtn');
    if (saveSupplierProductListBtn) saveSupplierProductListBtn.addEventListener('click', saveSupplierProductList);

    // Event listeners para botones de reset
    const selectAllResetSectionsBtn = document.getElementById('selectAllResetSectionsBtn');
    if (selectAllResetSectionsBtn) selectAllResetSectionsBtn.addEventListener('click', selectAllResetSections);

    const deselectAllResetSectionsBtn = document.getElementById('deselectAllResetSectionsBtn');
    if (deselectAllResetSectionsBtn) deselectAllResetSectionsBtn.addEventListener('click', deselectAllResetSections);

    const closeResetOptionsModalBtn = document.getElementById('closeResetOptionsModalBtn');
    if (closeResetOptionsModalBtn) closeResetOptionsModalBtn.addEventListener('click', closeResetOptionsModal);

    const performSelectiveResetBtn = document.getElementById('performSelectiveResetBtn');
    if (performSelectiveResetBtn) performSelectiveResetBtn.addEventListener('click', performSelectiveReset);
}

document.addEventListener('DOMContentLoaded', function() {
    // Mostrar loading inicialmente
    showLoadingOverlay();

    loadAuthFromStorage();
    updateUIBasedOnAuth(); // Now safe to call after DOM is loaded

    // Initialize all button event listeners
    initializeButtonEventListeners();

    if (checkDashboardAccess()) {
        loadLicenseStatus(); // Cargar estado de licencia
        fetchAndDisplayData().then(() => {
            // Inicializar el texto del botón de ordenamiento
            updateSortButtonText();
            // Cargar órdenes de compra
            loadPurchaseOrders();
            // Ocultar loading después de cargar datos
            hideLoadingOverlay();
        }).catch(error => {
            console.error('Error loading data:', error);
            hideLoadingOverlay();
        });
    } else {
        // Si no hay acceso, ocultar loading
        hideLoadingOverlay();
    }
});