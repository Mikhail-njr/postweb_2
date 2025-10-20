const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const basicAuth = require('express-basic-auth');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Autenticación básica para operaciones que modifican datos
const authMiddleware = basicAuth({
    users: { 'admin': 'pos123' },
    challenge: true,
});

// Middleware para proteger solo operaciones de escritura
function protectWriteOperations(req, res, next) {
    if (req.method === 'GET') {
        // Permitir lecturas sin autenticación
        return next();
    }
    // Para POST, PUT, DELETE requerir autenticación
    return authMiddleware(req, res, next);
}

// Aplicar protección a rutas de productos (lectura pública, escritura protegida)
app.use('/api/products', protectWriteOperations);
app.use('/api/sales', authMiddleware);
app.use('/api/categories', protectWriteOperations);

// Logging de requests (comentado para debug)
// app.use((req, res, next) => {
//     console.log(`${req.method} ${req.url}`);
//     next();
// });

// CSP comentado temporalmente para debug
// app.use((req, res, next) => {
//     res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;");
//     next();
// });

// Servir archivos frontend desde carpeta ../Frontend (AGREGADO)
app.use(express.static(path.join(__dirname, '../Frontend'), { maxAge: 0 }));

// Configuración de SQLite con optimizaciones
const dbPath = path.join(__dirname, 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a SQLite:', err.message);
    } else {
        console.log('✅ Conectado a la base de datos SQLite');
        // Optimizar SQLite para mejor rendimiento
        db.run('PRAGMA journal_mode = WAL');
        db.run('PRAGMA synchronous = NORMAL');
        db.run('PRAGMA cache_size = 1000000');
        db.run('PRAGMA temp_store = memory');
        initDatabase();
    }
});

// Inicializar la base de datos
function initDatabase() {
    db.serialize(() => {
        // Tabla productos
        db.run(`CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT UNIQUE NOT NULL,
            nombre TEXT NOT NULL,
            descripcion TEXT,
            precio REAL NOT NULL,
            stock INTEGER DEFAULT 0,
            categoria TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tabla ventas
        db.run(`CREATE TABLE IF NOT EXISTS ventas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero_factura TEXT UNIQUE NOT NULL,
            total REAL NOT NULL,
            metodo_pago TEXT NOT NULL,
            vuelto REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tabla items_venta
        db.run(`CREATE TABLE IF NOT EXISTS venta_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venta_id INTEGER NOT NULL,
            producto_id INTEGER NOT NULL,
            cantidad INTEGER NOT NULL,
            precio_unitario REAL NOT NULL,
            precio_original REAL,
            descuento_porcentaje REAL DEFAULT 0,
            subtotal REAL NOT NULL,
            FOREIGN KEY (venta_id) REFERENCES ventas(id),
            FOREIGN KEY (producto_id) REFERENCES productos(id)
        )`);

        // Tabla cierres_caja
        db.run(`CREATE TABLE IF NOT EXISTS cierres_caja (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            dinero_inicial REAL NOT NULL,
            total_ventas REAL NOT NULL,
            total_esperado REAL NOT NULL,
            diferencia REAL NOT NULL,
            cantidad_ventas INTEGER NOT NULL
        )`);

        // Tabla proveedores (suppliers)
        db.run(`CREATE TABLE IF NOT EXISTS proveedores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_proveedor TEXT NOT NULL,
            nombre_contacto TEXT,
            telefono TEXT,
            email TEXT,
            productos_servicios TEXT,
            condiciones_pago TEXT,
            estatus TEXT DEFAULT 'Activo',
            notas TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tabla promociones
        db.run(`CREATE TABLE IF NOT EXISTS promociones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tabla items de promociones
        db.run(`CREATE TABLE IF NOT EXISTS promocion_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            promocion_id INTEGER NOT NULL,
            producto_id INTEGER NOT NULL,
            descuento_porcentaje REAL NOT NULL,
            FOREIGN KEY (promocion_id) REFERENCES promociones(id),
            FOREIGN KEY (producto_id) REFERENCES productos(id)
        )`);

        // Tabla configuración del sistema
        db.run(`CREATE TABLE IF NOT EXISTS configuracion (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            descripcion TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tabla registro de operaciones
        db.run(`CREATE TABLE IF NOT EXISTS operaciones_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo_operacion TEXT NOT NULL,
            descripcion TEXT NOT NULL,
            usuario TEXT,
            entidad_afectada TEXT,
            id_entidad INTEGER,
            datos_anteriores TEXT,
            datos_nuevos TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tabla de licencia
        db.run(`CREATE TABLE IF NOT EXISTS licencia (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clave_licencia TEXT UNIQUE NOT NULL,
            estado TEXT DEFAULT 'activa',
            fecha_activacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_expiracion DATETIME,
            datos_cliente TEXT
        )`);

        // Tabla de órdenes de compra a proveedores
        db.run(`CREATE TABLE IF NOT EXISTS ordenes_compra (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero_orden TEXT UNIQUE NOT NULL,
            proveedor_id INTEGER NOT NULL,
            estado TEXT DEFAULT 'pendiente', -- pendiente, enviada, recibida, cancelada
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_envio DATETIME,
            fecha_recepcion DATETIME,
            notas TEXT,
            total_esperado REAL DEFAULT 0,
            FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
        )`);

        // Tabla de items de órdenes de compra
        db.run(`CREATE TABLE IF NOT EXISTS orden_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orden_id INTEGER NOT NULL,
            producto_id INTEGER NOT NULL,
            cantidad_solicitada INTEGER NOT NULL,
            cantidad_recibida INTEGER DEFAULT 0,
            precio_unitario REAL NOT NULL,
            subtotal REAL NOT NULL,
            FOREIGN KEY (orden_id) REFERENCES ordenes_compra(id),
            FOREIGN KEY (producto_id) REFERENCES productos(id)
        )`);

        // Agregar columnas faltantes si no existen (para migraciones)
        db.run(`ALTER TABLE venta_items ADD COLUMN precio_original REAL`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.log('⚠️ Error adding precio_original column:', err.message);
            } else {
                console.log('✅ precio_original column added or already exists');
            }
        });

        db.run(`ALTER TABLE venta_items ADD COLUMN descuento_porcentaje REAL DEFAULT 0`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.log('⚠️ Error adding descuento_porcentaje column:', err.message);
            } else {
                console.log('✅ descuento_porcentaje column added or already exists');
            }
        });

        // Verificar que la tabla operaciones_log existe
        db.run(`CREATE TABLE IF NOT EXISTS operaciones_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo_operacion TEXT NOT NULL,
            descripcion TEXT NOT NULL,
            usuario TEXT,
            entidad_afectada TEXT,
            id_entidad INTEGER,
            datos_anteriores TEXT,
            datos_nuevos TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.log('⚠️ Error creating operaciones_log table:', err.message);
            } else {
                console.log('✅ operaciones_log table ready');
            }
        });

        // Insertar configuración por defecto para logging
        db.run(`INSERT OR IGNORE INTO configuracion (clave, valor, descripcion) VALUES (?, ?, ?)`,
            ['logging_enabled', 'true', 'Habilita o deshabilita el registro de operaciones para ahorrar consumo del sistema'],
            (err) => {
                if (err) {
                    console.log('⚠️ Error setting default logging config:', err.message);
                } else {
                    console.log('✅ Default logging configuration set');
                }
            });

        // Crear índices para mejor rendimiento
        db.run(`CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria)`, (err) => {
            if (err) console.log('⚠️ Error creating categoria index:', err.message);
        });
        db.run(`CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo)`, (err) => {
            if (err) console.log('⚠️ Error creating codigo index:', err.message);
        });
        db.run(`CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre)`, (err) => {
            if (err) console.log('⚠️ Error creating nombre index:', err.message);
        });
        db.run(`CREATE INDEX IF NOT EXISTS idx_productos_codigo_nombre ON productos(codigo, nombre)`, (err) => {
            if (err) console.log('⚠️ Error creating codigo_nombre index:', err.message);
        });
        db.run(`CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(created_at)`, (err) => {
            if (err) console.log('⚠️ Error creating ventas fecha index:', err.message);
        });
        db.run(`CREATE INDEX IF NOT EXISTS idx_operaciones_tipo ON operaciones_log(tipo_operacion)`, (err) => {
            if (err) console.log('⚠️ Error creating operaciones tipo index:', err.message);
        });
        db.run(`CREATE INDEX IF NOT EXISTS idx_ordenes_proveedor ON ordenes_compra(proveedor_id)`, (err) => {
            if (err) console.log('⚠️ Error creating ordenes proveedor index:', err.message);
        });
        db.run(`CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes_compra(estado)`, (err) => {
            if (err) console.log('⚠️ Error creating ordenes estado index:', err.message);
        });
        db.run(`CREATE INDEX IF NOT EXISTS idx_orden_items_orden ON orden_items(orden_id)`, (err) => {
            if (err) console.log('⚠️ Error creating orden items orden index:', err.message);
        });

        // Verificar si hay datos
        db.get("SELECT COUNT(*) as count FROM productos", (err, row) => {
            if (row.count === 0) {
                insertSampleData();
            }
        });
    });
}

// Insertar datos de ejemplo
function insertSampleData() {
    const productos = [
        ['LAP-001', 'Laptop HP 15.6"', 'Laptop HP con pantalla 15.6 pulgadas', 899.99, 25, 'Tecnología'],
        ['MON-001', 'Monitor Samsung 24"', 'Monitor Samsung 24 pulgadas Full HD', 249.99, 15, 'Tecnología'],
        ['TEC-001', 'Teclado Mecánico RGB', 'Teclado mecánico con iluminación RGB', 89.99, 30, 'Periféricos'],
        ['MOU-001', 'Mouse Inalámbrico', 'Mouse inalámbrico ergonómico', 39.99, 45, 'Periféricos'],
        ['AUD-001', 'Audífonos Bluetooth', 'Audífonos inalámbricos con cancelación de ruido', 79.99, 20, 'Audio'],
        ['CAM-001', 'Cámara Web HD', 'Cámara web 1080p para streaming', 59.99, 18, 'Video'],
        ['DIS-001', 'Disco Duro 1TB', 'Disco duro interno 1TB 7200RPM', 69.99, 12, 'Almacenamiento'],
        ['MEM-001', 'Memoria RAM 8GB', 'Memoria RAM DDR4 8GB 2666MHz', 49.99, 8, 'Componentes']
    ];

    const stmt = db.prepare(`
        INSERT INTO productos (codigo, nombre, descripcion, precio, stock, categoria) 
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    productos.forEach(producto => {
        stmt.run(producto, (err) => {
            if (err) {
                console.log('⚠️  Producto ya existe:', producto[0]);
            }
        });
    });

    stmt.finalize();
    console.log('✅ Datos de ejemplo insertados en SQLite');
}

// Función para hacer queries más fácil
function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Función para remover acentos
function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Función para formatear moneda (formato argentino)
function formatCurrency(amount) {
    return `$${parseFloat(amount).toFixed(2).replace('.', ',')}`;
}

// Función para obtener configuración
async function getConfig(clave) {
    try {
        const result = await dbAll("SELECT valor FROM configuracion WHERE clave = ?", [clave]);
        return result.length > 0 ? result[0].valor : null;
    } catch (error) {
        console.error('Error getting config:', error);
        return null;
    }
}

// Función para verificar licencia válida
async function checkLicense() {
    try {
        const licenses = await dbAll("SELECT * FROM licencia WHERE estado = 'activa' AND fecha_expiracion > datetime('now')");
        return licenses.length > 0;
    } catch (error) {
        console.error('Error checking license:', error);
        return false;
    }
}

// Función para obtener detalles de licencia con información de expiración
async function getLicenseDetails() {
    try {
        const licenses = await dbAll("SELECT * FROM licencia WHERE estado = 'activa' ORDER BY fecha_activacion DESC LIMIT 1");
        if (licenses.length === 0) {
            return { activated: false };
        }

        const license = licenses[0];
        const now = new Date();
        const expirationDate = new Date(license.fecha_expiracion);
        const daysRemaining = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));

        return {
            activated: true,
            expiration_date: license.fecha_expiracion,
            days_remaining: Math.max(0, daysRemaining),
            expired: daysRemaining <= 0
        };
    } catch (error) {
        console.error('Error getting license details:', error);
        return { activated: false, error: error.message };
    }
}

// Función para verificar y manejar licencias expiradas (solo visual, no automática)
async function checkExpiredLicenses() {
    try {
        // Solo verificar si hay licencias expiradas para mostrar información
        const expiredLicenses = await dbAll("SELECT * FROM licencia WHERE estado = 'activa' AND fecha_expiracion <= datetime('now')");

        if (expiredLicenses.length > 0) {
            console.log(`⚠️ Se encontraron ${expiredLicenses.length} licencias expiradas. El frontend mostrará alertas visuales.`);
            // No hacer limpieza automática, solo logging para información
        }
    } catch (error) {
        console.error('Error verificando licencias expiradas:', error);
    }
}

// Función para cargar códigos de activación desde archivo
function loadActivationCodes() {
    try {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, 'sysdata.dat');
        const encodedData = fs.readFileSync(filePath, 'utf8');
        const decodedData = Buffer.from(encodedData, 'base64').toString('utf8');
        const data = JSON.parse(decodedData);
        return data.activation_codes || [];
    } catch (error) {
        console.error('Error loading activation codes:', error);
        return [];
    }
}

// Función para guardar códigos de activación al archivo
function saveActivationCodes(codes) {
    try {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, 'sysdata.dat');
        const data = { activation_codes: codes };
        const jsonData = JSON.stringify(data, null, 2);
        const encodedData = Buffer.from(jsonData).toString('base64');
        fs.writeFileSync(filePath, encodedData, 'utf8');
    } catch (error) {
        console.error('Error saving activation codes:', error);
    }
}

// Función para activar licencia
async function activateLicense(licenseKey, clientData = null) {
    try {
        // Validar formato de clave (6 dígitos)
        if (!licenseKey || licenseKey.length !== 6 || !/^\d{6}$/.test(licenseKey)) {
            console.log('Validación fallida: formato inválido');
            return { success: false, message: 'Clave de licencia inválida' };
        }

        // Cargar códigos disponibles
        const availableCodes = loadActivationCodes();
        const codeIndex = availableCodes.indexOf(licenseKey);

        if (codeIndex === -1) {
            console.log('Validación fallida: código no encontrado');
            return { success: false, message: 'Clave de licencia inválida o ya utilizada' };
        }

        // Verificar si el código ya fue usado (independientemente del estado)
        const usedCode = await dbAll("SELECT id FROM licencia WHERE clave_licencia = ?", [licenseKey]);
        if (usedCode.length > 0) {
            return { success: false, message: 'Esta clave de activación ya fue utilizada' };
        }

        // Verificar si ya existe una licencia activa
        const existing = await dbAll("SELECT id FROM licencia WHERE estado = 'activa'");
        if (existing.length > 0) {
            return { success: false, message: 'Ya existe una licencia activa' };
        }

        // Calcular fecha de expiración (1 mes desde ahora)
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1);
        const expirationISO = expirationDate.toISOString();

        // Insertar nueva licencia con expiración
        const result = await dbRun(
            "INSERT INTO licencia (clave_licencia, estado, fecha_expiracion, datos_cliente) VALUES (?, 'activa', ?, ?)",
            [licenseKey, expirationISO, clientData ? JSON.stringify(clientData) : null]
        );

        // Remover el código usado del archivo
        availableCodes.splice(codeIndex, 1);
        saveActivationCodes(availableCodes);

        // Registrar en log
        logOperation(
            'LICENCIA_ACTIVADA',
            `Licencia activada: ${licenseKey} - Expira: ${expirationISO}`,
            'Sistema',
            'licencia',
            result.id,
            null,
            { clave_licencia: licenseKey, fecha_expiracion: expirationISO }
        );

        return { success: true, message: `Licencia activada exitosamente. Características premium disponibles hasta ${expirationDate.toLocaleDateString('es-AR')}.` };
    } catch (error) {
        console.error('Error activating license:', error);
        return { success: false, message: 'Error al activar la licencia: ' + error.message };
    }
}

// Función para registrar operaciones en el log (fire-and-forget para no bloquear)
function logOperation(tipoOperacion, descripcion, usuario = 'Sistema', entidadAfectada = null, idEntidad = null, datosAnteriores = null, datosNuevos = null) {
    // Verificar si hay licencia y si el logging está habilitado (async pero fire-and-forget)
    Promise.all([checkLicense(), getConfig('logging_enabled')]).then(([isLicensed, loggingEnabled]) => {
        if (!isLicensed || loggingEnabled !== 'true') {
            return; // Sin licencia o logging deshabilitado, salir silenciosamente
        }

        const query = `
            INSERT INTO operaciones_log (tipo_operacion, descripcion, usuario, entidad_afectada, id_entidad, datos_anteriores, datos_nuevos)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            tipoOperacion,
            descripcion,
            usuario,
            entidadAfectada,
            idEntidad,
            datosAnteriores ? JSON.stringify(datosAnteriores) : null,
            datosNuevos ? JSON.stringify(datosNuevos) : null
        ];

        dbRun(query, params).then(() => {
            // Rotación automática del log (mantener solo los últimos 1000 registros)
            return dbRun(`
                DELETE FROM operaciones_log
                WHERE id NOT IN (
                    SELECT id FROM operaciones_log
                    ORDER BY created_at DESC
                    LIMIT 1000
                )
            `);
        }).catch(error => {
            console.error('Error logging operation:', error);
            // No lanzamos error para no interrumpir la operación principal
        });
    }).catch(err => console.error('Error checking logging config:', err));
}

function dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}
//auto categorias
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await dbAll("SELECT DISTINCT categoria FROM productos WHERE categoria IS NOT NULL AND categoria != '' ORDER BY categoria");
        res.json(categories.map(row => row.categoria));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Middleware para agregar información de licencia a todas las respuestas
app.use(async (req, res, next) => {
    // Agregar información de licencia a todas las respuestas
    res.locals.isLicensed = await checkLicense();
    next();
});

// Rutas de activación
app.get('/activate', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/activate.html'));
});

app.post('/api/activate', async (req, res) => {
    const { licenseKey, clientData } = req.body;

    if (!licenseKey) {
        return res.status(400).json({ error: 'Clave de licencia requerida' });
    }

    const result = await activateLicense(licenseKey, clientData);

    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json({ error: result.message });
    }
});

app.get('/api/license-status', async (req, res) => {
    const licenseDetails = await getLicenseDetails();
    res.json(licenseDetails);
});

// Endpoint para desactivar licencia
app.post('/api/deactivate-license', authMiddleware, async (req, res) => {
    try {
        // Verificar que hay una licencia activa
        const activeLicenses = await dbAll("SELECT * FROM licencia WHERE estado = 'activa'");
        if (activeLicenses.length === 0) {
            return res.status(400).json({ error: 'No hay licencia activa para desactivar' });
        }

        // Desactivar todas las licencias activas
        await dbRun("UPDATE licencia SET estado = 'desactivada' WHERE estado = 'activa'");

        // Registrar en log
        logOperation(
            'LICENCIA_DESACTIVADA',
            'Licencia desactivada manualmente',
            'Sistema',
            'licencia',
            null,
            null,
            { licencias_desactivadas: activeLicenses.length }
        );

        res.json({ success: true, message: 'Licencia desactivada exitosamente. Las características premium ya no estarán disponibles.' });
    } catch (error) {
        console.error('Error deactivating license:', error);
        res.status(500).json({ error: 'Error al desactivar la licencia: ' + error.message });
    }
});

// Endpoint para verificar si se pueden generar reportes
app.get('/api/can-generate-reports', async (req, res) => {
    const isLicensed = await checkLicense();
    res.json({
        canGenerate: isLicensed,
        message: isLicensed ? 'Reportes disponibles' : 'Requiere licencia para generar reportes'
    });
});

// Rutas de la API
app.get('/api/products', async (req, res) => {
    try {
        const products = await dbAll(`
            SELECT
                p.*,
                COALESCE(pi.descuento_porcentaje, 0) as descuento_porcentaje,
                CASE WHEN pi.descuento_porcentaje > 0 THEN 1 ELSE 0 END as en_promocion,
                CASE WHEN pi.descuento_porcentaje > 0 THEN ROUND(p.precio * (1 - pi.descuento_porcentaje / 100), 2) ELSE p.precio END as precio_con_descuento
            FROM productos p
            LEFT JOIN promocion_items pi ON p.id = pi.producto_id
            ORDER BY p.nombre
        `);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// >>> NUEVA RUTA para obtener todas las ventas agrupadas por factura
app.get('/api/sales', async (req, res) => {
    try {
        const { date, start_date, end_date } = req.query;

        // Construir condición de fecha
        let dateCondition = '';
        let dateParams = [];

        if (date) {
            // Filtrar por fecha específica (YYYY-MM-DD)
            dateCondition = 'WHERE DATE(v.created_at) = DATE(?)';
            dateParams = [date];
        } else if (start_date && end_date) {
            // Filtrar por rango de fechas
            dateCondition = 'WHERE DATE(v.created_at) BETWEEN DATE(?) AND DATE(?)';
            dateParams = [start_date, end_date];
        } else if (start_date) {
            // Filtrar desde fecha específica
            dateCondition = 'WHERE DATE(v.created_at) >= DATE(?)';
            dateParams = [start_date];
        } else if (end_date) {
            // Filtrar hasta fecha específica
            dateCondition = 'WHERE DATE(v.created_at) <= DATE(?)';
            dateParams = [end_date];
        }

        // Obtener ventas primero
        const salesQuery = `
            SELECT
                v.id,
                v.numero_factura,
                v.created_at AS fecha,
                v.total,
                v.metodo_pago,
                v.vuelto
            FROM ventas v
            ${dateCondition}
            ORDER BY v.created_at DESC
        `;

        const sales = await dbAll(salesQuery, dateParams);

        // Para cada venta, obtener sus items
        const processedSales = await Promise.all(sales.map(async (sale) => {
            const itemsQuery = `
                SELECT
                    vi.producto_id,
                    p.nombre,
                    vi.cantidad,
                    vi.precio_unitario,
                    vi.precio_original,
                    vi.descuento_porcentaje,
                    vi.subtotal
                FROM venta_items vi
                JOIN productos p ON vi.producto_id = p.id
                WHERE vi.venta_id = ?
                ORDER BY vi.id
            `;

            const items = await dbAll(itemsQuery, [sale.id]);

            let metodoPagoParsed = sale.metodo_pago;

            // Intentar parsear como JSON si contiene información detallada de pagos
            try {
                const parsed = JSON.parse(sale.metodo_pago);
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].metodo) {
                    // Es un array de pagos detallados
                    metodoPagoParsed = parsed;
                }
            } catch (e) {
                // No es JSON, mantener como string simple
                metodoPagoParsed = sale.metodo_pago;
            }

            return {
                id: sale.id,
                numero_factura: sale.numero_factura,
                fecha: sale.fecha,
                fecha_local: new Date(sale.fecha).toLocaleString('es-AR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }),
                total: sale.total,
                metodo_pago: metodoPagoParsed,
                vuelto: sale.vuelto || 0,
                items: items
            };
        }));

        // Log reducido para optimización de recursos
        console.log(`📊 ${processedSales.length} ventas obtenidas`);

        res.json(processedSales);
    } catch (error) {
        console.error('Error obteniendo ventas:', error);
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/products/search', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-cache');
        const { q, category, limit = 50, offset = 0, only_promotions } = req.query;
        // Construir query optimizada con filtrado en SQL
        let query = `
            SELECT
                p.*,
                COALESCE(pi.descuento_porcentaje, 0) as descuento_porcentaje,
                CASE WHEN pi.descuento_porcentaje > 0 THEN 1 ELSE 0 END as en_promocion,
                CASE WHEN pi.descuento_porcentaje > 0 THEN ROUND(p.precio * (1 - pi.descuento_porcentaje / 100), 2) ELSE p.precio END as precio_con_descuento
            FROM productos p
            LEFT JOIN promocion_items pi ON p.id = pi.producto_id
        `;

        let conditions = [];
        let params = [];

        // Agregar condición de categoría si existe
        if (category) {
            conditions.push("p.categoria = ?");
            params.push(category);
        }

        // Agregar condición de búsqueda si existe q
        if (q && q.trim()) {
            const searchTerm = q.trim();
            // Usar LIKE con wildcards para búsqueda flexible
            // Buscar en nombre y código (case-insensitive)
            conditions.push("(LOWER(p.nombre) LIKE LOWER(?) OR LOWER(p.codigo) LIKE LOWER(?))");
            params.push(`%${searchTerm}%`, `%${searchTerm}%`);
        }

        // Agregar condición de solo promociones si está activado
        if (only_promotions === 'true') {
            conditions.push("pi.descuento_porcentaje > 0");
        }

        // Agregar WHERE si hay condiciones
        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        // Ordenar por nombre para consistencia
        query += " ORDER BY p.nombre";

        // Agregar LIMIT y OFFSET para paginación
        const limitNum = Math.min(parseInt(limit) || 50, 200); // Máximo 200 resultados
        const offsetNum = Math.max(parseInt(offset) || 0, 0);
        query += ` LIMIT ${limitNum} OFFSET ${offsetNum}`;

        const products = await dbAll(query, params);

        // Agregar metadata de paginación en la respuesta
        const response = {
            products: products,
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                hasMore: products.length === limitNum
            },
            search: {
                query: q || null,
                category: category || null,
                only_promotions: only_promotions === 'true'
            }
        };

        res.json(response);
    } catch (error) {
        console.error('❌ Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener productos con descuentos activos (debe ir ANTES de /api/products/:id)
app.get('/api/products/with-discounts', async (req, res) => {
    try {
        const products = await dbAll(`
            SELECT
                p.*,
                COALESCE(pi.descuento_porcentaje, 0) as descuento_porcentaje,
                CASE WHEN pi.descuento_porcentaje > 0 THEN 1 ELSE 0 END as en_promocion,
                CASE WHEN pi.descuento_porcentaje > 0 THEN ROUND(p.precio * (1 - pi.descuento_porcentaje / 100), 2) ELSE p.precio END as precio_con_descuento
            FROM productos p
            LEFT JOIN promocion_items pi ON p.id = pi.producto_id
            ORDER BY p.nombre
        `);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await dbAll(`
            SELECT
                p.*,
                COALESCE(pi.descuento_porcentaje, 0) as descuento_porcentaje,
                CASE WHEN pi.descuento_porcentaje > 0 THEN 1 ELSE 0 END as en_promocion,
                CASE WHEN pi.descuento_porcentaje > 0 THEN ROUND(p.precio * (1 - pi.descuento_porcentaje / 100), 2) ELSE p.precio END as precio_con_descuento
            FROM productos p
            LEFT JOIN promocion_items pi ON p.id = pi.producto_id
            WHERE p.id = ?
        `, [req.params.id]);

        if (product.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(product[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// >>> NUEVA RUTA para crear productos
app.post('/api/products', async (req, res) => {
    const { codigo, nombre, descripcion, precio, stock, categoria } = req.body;

    // Validaciones
    if (!codigo || !nombre || precio === undefined || stock === undefined) {
        return res.status(400).json({ error: 'Código, nombre, precio y stock son campos requeridos' });
    }

    if (typeof precio !== 'number' || precio < 0) {
        return res.status(400).json({ error: 'El precio debe ser un número positivo' });
    }

    if (typeof stock !== 'number' || stock < 0 || !Number.isInteger(stock)) {
        return res.status(400).json({ error: 'El stock debe ser un número entero positivo' });
    }

    try {
        // Verificar que el código no esté duplicado
        const existingProduct = await dbAll("SELECT id FROM productos WHERE codigo = ?", [codigo]);
        if (existingProduct.length > 0) {
            return res.status(400).json({ error: 'Ya existe un producto con este código' });
        }

        // Insertar el nuevo producto
        const result = await dbRun(
            `INSERT INTO productos (codigo, nombre, descripcion, precio, stock, categoria)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [codigo, nombre, descripcion || '', precio, stock, categoria || '']
        );

        // Obtener el producto recién creado
        const newProduct = await dbAll("SELECT * FROM productos WHERE id = ?", [result.id]);

        // Registrar la operación en el log
        logOperation(
            'PRODUCTO_CREADO',
            `Producto creado: ${nombre} (${codigo})`,
            'Sistema',
            'productos',
            result.id,
            null,
            {
                codigo,
                nombre,
                precio,
                stock,
                categoria
            }
        );

        res.status(201).json({
            success: true,
            message: 'Producto creado exitosamente',
            product: newProduct[0]
        });

    } catch (error) {
        console.error('Error creando producto:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// >>> NUEVA RUTA para actualizar productos
app.put('/api/products/:id', async (req, res) => {
    const { codigo, nombre, descripcion, precio, stock, categoria } = req.body;
    const productId = req.params.id;

    try {
        // Verificar que el producto existe
        const existingProduct = await dbAll("SELECT * FROM productos WHERE id = ?", [productId]);
        if (existingProduct.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Verificar que el código no esté duplicado (excepto para el mismo producto)
        if (codigo) {
            const duplicateCode = await dbAll("SELECT id FROM productos WHERE codigo = ? AND id != ?", [codigo, productId]);
            if (duplicateCode.length > 0) {
                return res.status(400).json({ error: 'El código ya existe para otro producto' });
            }
        }

        // Obtener datos anteriores para el log
        const oldProduct = await dbAll("SELECT * FROM productos WHERE id = ?", [productId]);

        // Construir la consulta de actualización dinámicamente
        const updates = [];
        const params = [];

        if (codigo !== undefined) {
            updates.push("codigo = ?");
            params.push(codigo);
        }
        if (nombre !== undefined) {
            updates.push("nombre = ?");
            params.push(nombre);
        }
        if (descripcion !== undefined) {
            updates.push("descripcion = ?");
            params.push(descripcion);
        }
        if (precio !== undefined) {
            updates.push("precio = ?");
            params.push(parseFloat(precio));
        }
        if (stock !== undefined) {
            updates.push("stock = ?");
            params.push(parseInt(stock));
        }
        if (categoria !== undefined) {
            updates.push("categoria = ?");
            params.push(categoria);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
        }

        // Agregar el ID al final de los parámetros
        params.push(productId);

        const query = `UPDATE productos SET ${updates.join(", ")} WHERE id = ?`;
        const result = await dbRun(query, params);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Obtener el producto actualizado
        const updatedProduct = await dbAll("SELECT * FROM productos WHERE id = ?", [productId]);

        // Registrar la operación en el log
        const changes = [];
        if (codigo !== undefined && oldProduct[0].codigo !== codigo) changes.push(`código: ${oldProduct[0].codigo} → ${codigo}`);
        if (nombre !== undefined && oldProduct[0].nombre !== nombre) changes.push(`nombre: ${oldProduct[0].nombre} → ${nombre}`);
        if (precio !== undefined && oldProduct[0].precio !== parseFloat(precio)) changes.push(`precio: ${oldProduct[0].precio} → ${precio}`);
        if (stock !== undefined && oldProduct[0].stock !== parseInt(stock)) changes.push(`stock: ${oldProduct[0].stock} → ${stock}`);
        if (categoria !== undefined && oldProduct[0].categoria !== categoria) changes.push(`categoría: ${oldProduct[0].categoria || 'N/A'} → ${categoria || 'N/A'}`);

        if (changes.length > 0) {
            logOperation(
                'PRODUCTO_EDITADO',
                `Producto editado: ${updatedProduct[0].nombre} - Cambios: ${changes.join(', ')}`,
                'Sistema',
                'productos',
                productId,
                oldProduct[0],
                updatedProduct[0]
            );
        }

        res.json({
            success: true,
            message: 'Producto actualizado exitosamente',
            product: updatedProduct[0]
        });

    } catch (error) {
        console.error('Error actualizando producto:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

app.post('/api/sales', async (req, res) => {
    const { items, paymentMethod, metodo_pago, pagos, vuelto } = req.body;

    // Validar que hay items
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'La venta debe incluir al menos un item válido' });
    }

    // Determinar método de pago: usar pagos detallados si existen, sino el método simple
    let metodoPago;
    if (pagos && Array.isArray(pagos) && pagos.length > 0) {
        // Si hay pagos detallados, guardarlos como JSON
        metodoPago = JSON.stringify(pagos);
    } else {
        // Método de pago simple (compatibilidad hacia atrás)
        metodoPago = paymentMethod || metodo_pago || 'efectivo';
    }

    try {
        // Calcular total con descuentos aplicados
        let total = 0;
        const processedItems = items.map(item => {
            const precioOriginal = parseFloat(item.precio);
            const descuentoPorcentaje = parseFloat(item.descuento_porcentaje || 0);
            const precioConDescuento = descuentoPorcentaje > 0 ? precioOriginal * (1 - descuentoPorcentaje / 100) : precioOriginal;
            const subtotal = precioConDescuento * item.cantidad;
            total += subtotal;

            return {
                ...item,
                precioOriginal,
                precioConDescuento,
                subtotal
            };
        });

        const facturaNumber = `FAC-${Date.now()}`;

        // Obtener timestamp actual del servidor en formato ISO para consistencia
        const serverTimestamp = new Date().toISOString();

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        try {
            // Insertar venta con timestamp ISO
            const saleResult = await dbRun(
                "INSERT INTO ventas (numero_factura, total, metodo_pago, vuelto, created_at) VALUES (?, ?, ?, ?, ?)",
                [facturaNumber, total, metodoPago, vuelto || 0, serverTimestamp]
            );

            // Insertar items y actualizar stock
                for (const item of processedItems) {
                    await dbRun(
                        `INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, precio_original, descuento_porcentaje, subtotal)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [saleResult.id, item.id, item.cantidad, item.precioConDescuento, item.precioOriginal, item.descuento_porcentaje || 0, item.subtotal]
                    );
                    const stockUpdateResult = await dbRun(
                        "UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?",
                        [item.cantidad, item.id, item.cantidad]
                    );
                    if (stockUpdateResult.changes === 0) {
                        throw new Error(`Stock insuficiente para el producto ${item.nombre}. Cantidad solicitada: ${item.cantidad}`);
                    }
                }

            await dbRun("COMMIT");

            // Registrar la operación en el log (fire-and-forget)
            logOperation(
                'VENTA',
                `Venta registrada: ${facturaNumber} - Total: ${formatCurrency(total)}`,
                'Sistema',
                'ventas',
                saleResult.id,
                null,
                {
                    numero_factura: facturaNumber,
                    total: total,
                    metodo_pago: metodoPago,
                    items: processedItems.length
                }
            );

            // Obtener la fecha de la venta recién creada
            const saleData = await dbAll("SELECT created_at FROM ventas WHERE id = ?", [saleResult.id]);

            console.log(`✅ Venta registrada: ${facturaNumber} - $${total}`);

            res.json({
                success: true,
                numero_factura: facturaNumber,
                total: total,
                saleId: saleResult.id,
                fecha_venta: saleData[0].created_at,
                message: 'Venta registrada exitosamente en SQLite'
            });

        } catch (error) {
            try {
                await dbRun("ROLLBACK");
            } catch (rollbackError) {
                console.error('Error during rollback:', rollbackError.message);
                // No relanzar el error de rollback, mantener el error original
            }
            throw error;
        }

    } catch (error) {
        res.status(500).json({ 
            error: 'Error procesando la venta: ' + error.message 
        });
    }
});

// Ruta para obtener estadísticas
app.get('/api/stats', async (req, res) => {
    try {
        const totalProducts = await dbAll("SELECT COUNT(*) as count FROM productos");
        const totalSales = await dbAll("SELECT COUNT(*) as count FROM ventas");
        const totalRevenue = await dbAll("SELECT SUM(total) as total FROM ventas");

        // Obtener productos más vendidos
        const topProducts = await dbAll(`
            SELECT
                p.id,
                p.nombre,
                p.codigo,
                SUM(vi.cantidad) as total_vendido
            FROM venta_items vi
            JOIN productos p ON vi.producto_id = p.id
            GROUP BY p.id
            ORDER BY total_vendido DESC
        `);

        res.json({
            total_products: totalProducts[0].count,
            total_sales: totalSales[0].count,
            total_revenue: totalRevenue[0].total || 0,
            top_products: topProducts
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para obtener registro de operaciones
app.get('/api/operations-log', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const operations = await dbAll(`
            SELECT * FROM operaciones_log
            ORDER BY created_at DESC
            LIMIT ?
        `, [limit]);

        res.json(operations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta de diagnóstico para ventas (debug)
app.get('/api/debug-sales', async (req, res) => {
    try {
        const rawSales = await dbAll("SELECT * FROM ventas ORDER BY created_at DESC LIMIT 5");
        const rawItems = await dbAll("SELECT * FROM venta_items ORDER BY created_at DESC LIMIT 10");

        res.json({
            raw_sales: rawSales,
            raw_items: rawItems,
            sales_count: rawSales.length,
            items_count: rawItems.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para limpiar registro de operaciones
app.delete('/api/operations-log', async (req, res) => {
    try {
        await dbRun("DELETE FROM operaciones_log");

        // Registrar la operación de limpieza
        logOperation(
            'LOG_LIMPIADO',
            'Registro de operaciones limpiado manualmente',
            'Sistema',
            'operaciones_log',
            null,
            null,
            null
        );

        res.json({ success: true, message: 'Registro de operaciones limpiado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para obtener configuración de logging
app.get('/api/settings/logging-enabled', async (req, res) => {
    try {
        const loggingEnabled = await getConfig('logging_enabled');
        res.json({
            enabled: loggingEnabled === 'true',
            value: loggingEnabled
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para actualizar configuración de logging
app.put('/api/settings/logging-enabled', async (req, res) => {
    try {
        const { enabled } = req.body;
        const value = enabled ? 'true' : 'false';

        // Actualizar o insertar la configuración
        await dbRun(`
            INSERT OR REPLACE INTO configuracion (clave, valor, descripcion, updated_at)
            VALUES (?, ?, ?, datetime('now'))
        `, ['logging_enabled', value, 'Habilita o deshabilita el registro de operaciones para ahorrar consumo del sistema']);

        // Registrar la operación de cambio de configuración
        logOperation(
            'CONFIGURACION_ACTUALIZADA',
            `Registro de actividad ${enabled ? 'habilitado' : 'deshabilitado'}`,
            'Sistema',
            'configuracion',
            null,
            null,
            { clave: 'logging_enabled', valor: value }
        );

        res.json({
            success: true,
            message: `Registro de actividad ${enabled ? 'habilitado' : 'deshabilitado'} exitosamente`,
            enabled: enabled
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para calcular cierre de caja (preview)
app.post('/api/close-register-preview', async (req, res) => {
    try {
        const { fecha, dineroInicial } = req.body;

        // Validar dinero inicial
        const initialAmount = parseFloat(dineroInicial || 0);
        if (isNaN(initialAmount) || initialAmount < 0) {
            return res.status(400).json({ error: 'El dinero inicial debe ser un número positivo' });
        }

        // Obtener la fecha del último cierre del día
        const lastClose = await dbAll(`
            SELECT fecha FROM cierres_caja
            WHERE DATE(fecha) = DATE(?)
            ORDER BY fecha DESC
            LIMIT 1
        `, [fecha || new Date().toISOString()]);

        // Construir condición de fecha para ventas
        let dateCondition = "DATE(created_at) = DATE(?)";
        let dateParams = [fecha || new Date().toISOString()];

        if (lastClose.length > 0) {
            // Si hay un cierre anterior hoy, solo contar ventas después de ese cierre
            dateCondition = "datetime(created_at) > datetime(?)";
            dateParams = [lastClose[0].fecha];
        }

        // Obtener total de ventas desde el último cierre
        const dailySales = await dbAll(`
            SELECT
                SUM(total) as total,
                COUNT(*) as cantidad
            FROM ventas
            WHERE ${dateCondition}
        `, dateParams);

        // Calcular total esperado
        const totalVentas = parseFloat(dailySales[0].total || 0);
        const totalEsperado = initialAmount + totalVentas;

        // Para preview, el dinero contado es igual al esperado (diferencia = 0)
        const countedAmount = totalEsperado;
        const diferencia = 0;

        // Obtener detalles de ventas desde el último cierre
        const salesDetails = await dbAll(`
            SELECT
                v.id,
                v.numero_factura,
                v.total,
                v.metodo_pago,
                v.created_at,
                GROUP_CONCAT(
                    JSON_OBJECT(
                        'producto_id', vi.producto_id,
                        'nombre', p.nombre,
                        'cantidad', vi.cantidad,
                        'precio_unitario', vi.precio_unitario,
                        'precio_original', vi.precio_original,
                        'descuento_porcentaje', vi.descuento_porcentaje,
                        'subtotal', vi.subtotal
                    )
                ) as items
            FROM ventas v
            LEFT JOIN venta_items vi ON v.id = vi.venta_id
            LEFT JOIN productos p ON vi.producto_id = p.id
            WHERE ${dateCondition.replace('created_at', 'v.created_at')}
            GROUP BY v.id
        `, dateParams);

        // Procesar items JSON
        const processedSales = salesDetails.map(sale => ({
            ...sale,
            items: sale.items ? JSON.parse(`[${sale.items}]`) : []
        }));

        // Calcular totales por método de pago
        const paymentTotals = {};
        processedSales.forEach(sale => {
            let metodoPago = sale.metodo_pago;

            // Intentar parsear como JSON si contiene información detallada de pagos
            try {
                const parsed = JSON.parse(sale.metodo_pago);
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].metodo) {
                    // Es un array de pagos detallados
                    parsed.forEach(pago => {
                        const metodo = pago.metodo.toUpperCase();
                        const monto = parseFloat(pago.monto || 0);
                        paymentTotals[metodo] = (paymentTotals[metodo] || 0) + monto;
                    });
                    return;
                }
            } catch (e) {
                // No es JSON, mantener como string simple
                metodoPago = sale.metodo_pago;
            }

            // Método de pago simple
            const metodo = metodoPago.toUpperCase();
            paymentTotals[metodo] = (paymentTotals[metodo] || 0) + parseFloat(sale.total || 0);
        });

        res.json({
            success: true,
            dinero_inicial: initialAmount,
            dinero_contado: countedAmount,
            total: totalVentas,
            total_esperado: totalEsperado,
            diferencia: diferencia,
            cantidad_ventas: dailySales[0].cantidad || 0,
            ventas: processedSales,
            payment_totals: paymentTotals,
            fecha: fecha || new Date().toISOString(),
            preview: true // Indica que es solo preview
        });

    } catch (error) {
        console.error('Error en preview de cierre de caja:', error);
        res.status(500).json({
            error: 'Error en preview de cierre de caja: ' + error.message
        });
    }
});

// Ruta para confirmar y guardar cierre de caja
app.post('/api/close-register-confirm', async (req, res) => {
    try {
        const { fecha, dinero_inicial, total, total_esperado, diferencia, cantidad_ventas } = req.body;

        // Guardar el cierre en la base de datos
        await dbRun(
            `INSERT INTO cierres_caja
            (fecha, dinero_inicial, total_ventas, total_esperado, diferencia, cantidad_ventas)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [fecha, dinero_inicial, total, total_esperado, diferencia, cantidad_ventas]
        );

        res.json({
            success: true,
            message: 'Cierre de caja confirmado y registrado exitosamente'
        });

    } catch (error) {
        console.error('Error confirmando cierre de caja:', error);
        res.status(500).json({
            error: 'Error confirmando cierre de caja: ' + error.message
        });
    }
});

// Ruta para cierre de caja (legacy - mantiene compatibilidad)
app.post('/api/close-register', async (req, res) => {
    try {
        const { fecha, dineroInicial, dineroContado } = req.body;

        // Validar dinero inicial
        const initialAmount = parseFloat(dineroInicial || 0);
        if (isNaN(initialAmount) || initialAmount < 0) {
            return res.status(400).json({ error: 'El dinero inicial debe ser un número positivo' });
        }

        // Obtener la fecha del último cierre del día
        const lastClose = await dbAll(`
            SELECT fecha FROM cierres_caja
            WHERE DATE(fecha) = DATE(?)
            ORDER BY fecha DESC
            LIMIT 1
        `, [fecha || new Date().toISOString()]);

        // Construir condición de fecha para ventas
        let dateCondition = "DATE(created_at) = DATE(?)";
        let dateParams = [fecha || new Date().toISOString()];

        if (lastClose.length > 0) {
            // Si hay un cierre anterior hoy, solo contar ventas después de ese cierre
            dateCondition = "datetime(created_at) > datetime(?)";
            dateParams = [lastClose[0].fecha];
        }

        // Obtener total de ventas desde el último cierre
        const dailySales = await dbAll(`
            SELECT
                SUM(total) as total,
                COUNT(*) as cantidad
            FROM ventas
            WHERE ${dateCondition}
        `, dateParams);

        // Calcular total esperado
        const totalVentas = parseFloat(dailySales[0].total || 0);
        const totalEsperado = initialAmount + totalVentas;

        // Determinar dinero contado
        let countedAmount;
        if (dineroContado === 'auto') {
            // Modo automático: usar el total esperado como dinero contado
            countedAmount = totalEsperado;
        } else {
            // Modo manual: validar el valor proporcionado
            countedAmount = parseFloat(dineroContado || 0);
            if (isNaN(countedAmount) || countedAmount < 0) {
                return res.status(400).json({ error: 'El dinero contado debe ser un número positivo' });
            }
        }

        // Obtener detalles de ventas desde el último cierre
        const salesDetails = await dbAll(`
            SELECT
                v.id,
                v.numero_factura,
                v.total,
                v.metodo_pago,
                v.created_at,
                GROUP_CONCAT(
                    JSON_OBJECT(
                        'producto_id', vi.producto_id,
                        'nombre', p.nombre,
                        'cantidad', vi.cantidad,
                        'precio_unitario', vi.precio_unitario,
                        'precio_original', vi.precio_original,
                        'descuento_porcentaje', vi.descuento_porcentaje,
                        'subtotal', vi.subtotal
                    )
                ) as items
            FROM ventas v
            LEFT JOIN venta_items vi ON v.id = vi.venta_id
            LEFT JOIN productos p ON vi.producto_id = p.id
            WHERE ${dateCondition.replace('created_at', 'v.created_at')}
            GROUP BY v.id
        `, dateParams);

        // Procesar items JSON
        const processedSales = salesDetails.map(sale => ({
            ...sale,
            items: sale.items ? JSON.parse(`[${sale.items}]`) : []
        }));

        // Calcular diferencia
        const diferencia = totalEsperado - countedAmount;

        // Guardar el cierre en la base de datos
        await dbRun(
            `INSERT INTO cierres_caja
            (fecha, dinero_inicial, total_ventas, total_esperado, diferencia, cantidad_ventas)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [new Date().toISOString(), initialAmount, totalVentas, totalEsperado, diferencia, dailySales[0].cantidad || 0]
        );

        // Registrar la operación en el log
        logOperation(
            'CIERRE_CAJA',
            `Cierre de caja realizado - Total: ${formatCurrency(totalEsperado)}`,
            'Sistema',
            'cierres_caja',
            result.id,
            null,
            {
                dinero_inicial: initialAmount,
                total_ventas: totalVentas,
                total_esperado: totalEsperado,
                diferencia: diferencia,
                cantidad_ventas: dailySales[0].cantidad || 0
            }
        );

        res.json({
            success: true,
            dinero_inicial: initialAmount,
            dinero_contado: countedAmount,
            total: totalVentas,
            total_esperado: totalEsperado,
            diferencia: diferencia,
            cantidad_ventas: dailySales[0].cantidad || 0,
            ventas: processedSales,
            fecha: fecha || new Date().toISOString()
        });

    } catch (error) {
        console.error('Error en el cierre de caja:', error);
        res.status(500).json({
            error: 'Error en el cierre de caja: ' + error.message
        });
    }
});

// Ruta para obtener historial de cierres
app.get('/api/cierres', async (req, res) => {
    try {
        const cierres = await dbAll(`
            SELECT * FROM cierres_caja
            ORDER BY fecha DESC
        `);
        res.json(cierres);
    } catch (error) {
        res.status(500).json({
            error: 'Error obteniendo historial de cierres: ' + error.message
        });
    }
});

// Ruta para resetear datos de ventas y cierres (para testing)
app.post('/api/reset-data', authMiddleware, async (req, res) => {
    try {
        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        try {
            // Eliminar todos los items de venta
            await dbRun("DELETE FROM venta_items");

            // Eliminar todas las ventas
            await dbRun("DELETE FROM ventas");

            // Eliminar todos los cierres de caja
            await dbRun("DELETE FROM cierres_caja");

            // Eliminar registros de operaciones relacionadas con ventas
            await dbRun("DELETE FROM operaciones_log WHERE tipo_operacion = 'VENTA'");

            // Resetear stock de productos (opcional, comentado)
            // await dbRun("UPDATE productos SET stock = 0");

            await dbRun("COMMIT");

            res.json({
                success: true,
                message: 'Datos de ventas, cierres e historial de operaciones reseteados exitosamente. Los productos permanecen intactos.'
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error reseteando datos:', error);
        res.status(500).json({
            error: 'Error reseteando datos: ' + error.message
        });
    }
});

// Ruta para restaurar backup completo
app.post('/api/restore-backup', authMiddleware, async (req, res) => {
    const backupData = req.body;

    // Validar estructura del backup
    if (!backupData.data || !backupData.timestamp || !backupData.version) {
        return res.status(400).json({ error: 'Estructura de backup inválida' });
    }

    try {
        // Iniciar transacción principal
        await dbRun("BEGIN TRANSACTION");

        try {
            // 1. Limpiar datos existentes
            await dbRun("DELETE FROM operaciones_log");
            await dbRun("DELETE FROM venta_items");
            await dbRun("DELETE FROM ventas");
            await dbRun("DELETE FROM promocion_items");
            await dbRun("DELETE FROM promociones");
            await dbRun("DELETE FROM cierres_caja");
            await dbRun("DELETE FROM proveedores");
            // NOTA: No eliminamos productos para preservar configuraciones existentes

            // 2. Restaurar productos (si existen en el backup)
            if (backupData.data.products && Array.isArray(backupData.data.products)) {
                for (const product of backupData.data.products) {
                    try {
                        await dbRun(
                            `INSERT OR REPLACE INTO productos
                             (id, codigo, nombre, descripcion, precio, stock, categoria, created_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                product.id,
                                product.codigo,
                                product.nombre,
                                product.descripcion || '',
                                product.precio,
                                product.stock,
                                product.categoria || '',
                                product.created_at || new Date().toISOString()
                            ]
                        );
                    } catch (e) {
                        console.warn('Error restoring product:', product.id, e.message);
                    }
                }
            }

            // 3. Restaurar proveedores
            if (backupData.data.suppliers && Array.isArray(backupData.data.suppliers)) {
                for (const supplier of backupData.data.suppliers) {
                    try {
                        await dbRun(
                            `INSERT OR REPLACE INTO proveedores
                             (id, nombre_proveedor, nombre_contacto, telefono, email, productos_servicios, condiciones_pago, estatus, notas, created_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                supplier.id,
                                supplier.nombre_proveedor,
                                supplier.nombre_contacto || '',
                                supplier.telefono || '',
                                supplier.email || '',
                                supplier.productos_servicios || '',
                                supplier.condiciones_pago || '',
                                supplier.estatus || 'Activo',
                                supplier.notas || '',
                                supplier.created_at || new Date().toISOString()
                            ]
                        );
                    } catch (e) {
                        console.warn('Error restoring supplier:', supplier.id, e.message);
                    }
                }
            }

            // 4. Restaurar promociones
            if (backupData.data.promotions && Array.isArray(backupData.data.promotions)) {
                for (const promotion of backupData.data.promotions) {
                    try {
                        // Insertar promoción
                        await dbRun(
                            `INSERT OR REPLACE INTO promociones (id, titulo, created_at) VALUES (?, ?, ?)`,
                            [promotion.id, promotion.titulo, promotion.created_at || new Date().toISOString()]
                        );

                        // Insertar items de la promoción
                        if (promotion.items && Array.isArray(promotion.items)) {
                            for (const item of promotion.items) {
                                await dbRun(
                                    `INSERT OR REPLACE INTO promocion_items
                                     (id, promocion_id, producto_id, descuento_porcentaje)
                                     VALUES (?, ?, ?, ?)`,
                                    [item.id, promotion.id, item.producto_id, item.descuento_porcentaje]
                                );
                            }
                        }
                    } catch (e) {
                        console.warn('Error restoring promotion:', promotion.id, e.message);
                    }
                }
            }

            // 5. Restaurar ventas
            if (backupData.data.sales && Array.isArray(backupData.data.sales)) {
                for (const sale of backupData.data.sales) {
                    try {
                        // Insertar venta
                        await dbRun(
                            `INSERT OR REPLACE INTO ventas
                             (id, numero_factura, total, metodo_pago, vuelto, created_at)
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [
                                sale.id,
                                sale.numero_factura,
                                sale.total,
                                typeof sale.metodo_pago === 'string' ? sale.metodo_pago : JSON.stringify(sale.metodo_pago),
                                sale.vuelto || 0,
                                sale.fecha || sale.created_at || new Date().toISOString()
                            ]
                        );

                        // Insertar items de la venta
                        if (sale.items && Array.isArray(sale.items)) {
                            for (const item of sale.items) {
                                await dbRun(
                                    `INSERT OR REPLACE INTO venta_items
                                     (venta_id, producto_id, cantidad, precio_unitario, precio_original, descuento_porcentaje, subtotal)
                                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                    [
                                        sale.id,
                                        item.producto_id || item.id,
                                        item.cantidad,
                                        item.precio_unitario,
                                        item.precio_original || item.precio_unitario,
                                        item.descuento_porcentaje || 0,
                                        item.subtotal || (item.cantidad * item.precio_unitario)
                                    ]
                                );
                            }
                        }
                    } catch (e) {
                        console.warn('Error restoring sale:', sale.id, e.message);
                    }
                }
            }

            // 6. Restaurar cierres de caja
            if (backupData.data.cierres_caja && Array.isArray(backupData.data.cierres_caja)) {
                for (const cierre of backupData.data.cierres_caja) {
                    try {
                        await dbRun(
                            `INSERT OR REPLACE INTO cierres_caja
                             (id, fecha, dinero_inicial, total_ventas, total_esperado, diferencia, cantidad_ventas)
                             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [
                                cierre.id,
                                cierre.fecha,
                                cierre.dinero_inicial,
                                cierre.total_ventas,
                                cierre.total_esperado,
                                cierre.diferencia,
                                cierre.cantidad_ventas
                            ]
                        );
                    } catch (e) {
                        console.warn('Error restoring cierre:', cierre.id, e.message);
                    }
                }
            }

            // 7. Restaurar registro de operaciones
            if (backupData.data.operations_log && Array.isArray(backupData.data.operations_log)) {
                for (const operation of backupData.data.operations_log) {
                    try {
                        await dbRun(
                            `INSERT OR REPLACE INTO operaciones_log
                             (id, tipo_operacion, descripcion, usuario, entidad_afectada, id_entidad, datos_anteriores, datos_nuevos, created_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                operation.id,
                                operation.tipo_operacion,
                                operation.descripcion,
                                operation.usuario || 'Sistema',
                                operation.entidad_afectada || null,
                                operation.id_entidad || null,
                                operation.datos_anteriores || null,
                                operation.datos_nuevos || null,
                                operation.created_at || new Date().toISOString()
                            ]
                        );
                    } catch (e) {
                        console.warn('Error restoring operation:', operation.id, e.message);
                    }
                }
            }

            await dbRun("COMMIT");

            // Registrar la operación de restauración
            logOperation(
                'BACKUP_RESTAURADO',
                `Backup restaurado - Timestamp: ${backupData.timestamp}`,
                'Sistema',
                'sistema',
                null,
                null,
                {
                    timestamp: backupData.timestamp,
                    version: backupData.version,
                    sections_restored: Object.keys(backupData.data)
                }
            );

            res.json({
                success: true,
                message: 'Backup restaurado exitosamente',
                timestamp: backupData.timestamp,
                sections_restored: Object.keys(backupData.data)
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error restoring backup:', error);
        res.status(500).json({
            error: 'Error al restaurar el backup: ' + error.message
        });
    }
});

// Ruta para resetear datos selectivamente
app.post('/api/reset-data-selective', authMiddleware, async (req, res) => {
    const { resetVentas, resetCierres, resetProveedores, resetPromociones, resetLog, resetMetricas } = req.body;

    try {
        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        const resetActions = [];
        const logActions = [];

        try {
            // Preparar las acciones de reset
            if (resetVentas) {
                resetActions.push('ventas');
                logActions.push('VENTA');
            }
            if (resetCierres) {
                resetActions.push('cierres de caja');
                logActions.push('CIERRE_CAJA');
            }
            if (resetProveedores) {
                resetActions.push('proveedores');
                logActions.push('PROVEEDOR');
            }
            if (resetPromociones) {
                resetActions.push('promociones');
                logActions.push('PROMOCION');
            }
            if (resetLog) {
                resetActions.push('registro de operaciones');
                logActions.push('LOG_OPERACIONES');
            }
            if (resetMetricas) {
                resetActions.push('métricas');
                logActions.push('METRICAS');
            }

            // Registrar la operación de reset selectivo ANTES de hacer los deletes
            if (resetActions.length > 0) {
                logOperation(
                    'RESET_SELECTIVO',
                    `Reset selectivo realizado: ${resetActions.join(', ')}`,
                    'Sistema',
                    'sistema',
                    null,
                    null,
                    {
                        acciones: resetActions,
                        tipos_operacion: logActions
                    }
                );
            }

            // Ejecutar los resets
            if (resetVentas) {
                await dbRun("DELETE FROM venta_items");
                await dbRun("DELETE FROM ventas");
                // También eliminar registros de operaciones relacionadas con ventas
                await dbRun("DELETE FROM operaciones_log WHERE tipo_operacion = 'VENTA'");
            }

            if (resetCierres) {
                await dbRun("DELETE FROM cierres_caja");
            }

            if (resetProveedores) {
                await dbRun("DELETE FROM proveedores");
                // Eliminar registros de operaciones relacionadas con proveedores
                await dbRun("DELETE FROM operaciones_log WHERE tipo_operacion = 'PROVEEDOR_CREADO'");
            }

            if (resetPromociones) {
                await dbRun("DELETE FROM promocion_items");
                await dbRun("DELETE FROM promociones");
                // Eliminar registros de operaciones relacionadas con promociones
                await dbRun("DELETE FROM operaciones_log WHERE tipo_operacion = 'PROMOCION_CREADA'");
            }

            if (resetLog) {
                await dbRun("DELETE FROM operaciones_log");
            }

            await dbRun("COMMIT");

            const message = resetActions.length > 0
                ? `Datos reseteados exitosamente: ${resetActions.join(', ')}. Los productos permanecen intactos.`
                : 'No se realizó ningún reset (ninguna opción seleccionada).';

            res.json({
                success: true,
                message: message,
                resetActions: resetActions
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error en reset selectivo:', error);
        res.status(500).json({
            error: 'Error en reset selectivo: ' + error.message
        });
    }
});

// >>> RUTAS PARA PROVEEDORES (SUPPLIERS)

// Obtener todos los proveedores
app.get('/api/suppliers', async (req, res) => {
    try {
        const suppliers = await dbAll("SELECT * FROM proveedores ORDER BY nombre_proveedor");
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener un proveedor por ID
app.get('/api/suppliers/:id', async (req, res) => {
    try {
        const supplier = await dbAll("SELECT * FROM proveedores WHERE id = ?", [req.params.id]);
        if (supplier.length === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }
        res.json(supplier[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear nuevo proveedor
app.post('/api/suppliers', async (req, res) => {
    const { nombre_proveedor, nombre_contacto, telefono, email, productos_servicios, condiciones_pago, estatus, notas } = req.body;

    // Validaciones
    if (!nombre_proveedor || nombre_proveedor.trim() === '') {
        return res.status(400).json({ error: 'El nombre del proveedor es requerido' });
    }

    try {
        const result = await dbRun(
            `INSERT INTO proveedores (nombre_proveedor, nombre_contacto, telefono, email, productos_servicios, condiciones_pago, estatus, notas)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre_proveedor.trim(), nombre_contacto || '', telefono || '', email || '', productos_servicios || '', condiciones_pago || '', estatus || 'Activo', notas || '']
        );

        const newSupplier = await dbAll("SELECT * FROM proveedores WHERE id = ?", [result.id]);

        // Registrar la operación en el log
        logOperation(
            'PROVEEDOR_CREADO',
            `Proveedor creado: ${nombre_proveedor}`,
            'Sistema',
            'proveedores',
            result.id,
            null,
            {
                nombre_proveedor,
                nombre_contacto,
                telefono,
                email
            }
        );

        res.status(201).json({
            success: true,
            message: 'Proveedor creado exitosamente',
            supplier: newSupplier[0]
        });

    } catch (error) {
        console.error('Error creando proveedor:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Actualizar proveedor
app.put('/api/suppliers/:id', async (req, res) => {
    const { nombre_proveedor, nombre_contacto, telefono, email, productos_servicios, condiciones_pago, estatus, notas } = req.body;
    const supplierId = req.params.id;

    try {
        // Verificar que el proveedor existe
        const existingSupplier = await dbAll("SELECT * FROM proveedores WHERE id = ?", [supplierId]);
        if (existingSupplier.length === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        // Validar nombre si se proporciona
        if (nombre_proveedor !== undefined && (!nombre_proveedor || nombre_proveedor.trim() === '')) {
            return res.status(400).json({ error: 'El nombre del proveedor no puede estar vacío' });
        }

        // Construir consulta de actualización dinámicamente
        const updates = [];
        const params = [];

        if (nombre_proveedor !== undefined) {
            updates.push("nombre_proveedor = ?");
            params.push(nombre_proveedor.trim());
        }
        if (nombre_contacto !== undefined) {
            updates.push("nombre_contacto = ?");
            params.push(nombre_contacto);
        }
        if (telefono !== undefined) {
            updates.push("telefono = ?");
            params.push(telefono);
        }
        if (email !== undefined) {
            updates.push("email = ?");
            params.push(email);
        }
        if (productos_servicios !== undefined) {
            updates.push("productos_servicios = ?");
            params.push(productos_servicios);
        }
        if (condiciones_pago !== undefined) {
            updates.push("condiciones_pago = ?");
            params.push(condiciones_pago);
        }
        if (estatus !== undefined) {
            updates.push("estatus = ?");
            params.push(estatus);
        }
        if (notas !== undefined) {
            updates.push("notas = ?");
            params.push(notas);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
        }

        params.push(supplierId);
        const query = `UPDATE proveedores SET ${updates.join(", ")} WHERE id = ?`;
        const result = await dbRun(query, params);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        const updatedSupplier = await dbAll("SELECT * FROM proveedores WHERE id = ?", [supplierId]);

        res.json({
            success: true,
            message: 'Proveedor actualizado exitosamente',
            supplier: updatedSupplier[0]
        });

    } catch (error) {
        console.error('Error actualizando proveedor:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Eliminar proveedor
app.delete('/api/suppliers/:id', async (req, res) => {
    try {
        const supplierId = req.params.id;

        // Verificar que el proveedor existe
        const existingSupplier = await dbAll("SELECT * FROM proveedores WHERE id = ?", [supplierId]);
        if (existingSupplier.length === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        await dbRun("DELETE FROM proveedores WHERE id = ?", [supplierId]);

        res.json({
            success: true,
            message: 'Proveedor eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando proveedor:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// >>> RUTAS PARA PROMOCIONES

// Obtener todas las promociones
app.get('/api/promotions', async (req, res) => {
    try {
        const promotions = await dbAll(`
            SELECT
                p.id,
                p.titulo,
                p.created_at,
                COUNT(pi.id) as productos_count
            FROM promociones p
            LEFT JOIN promocion_items pi ON p.id = pi.promocion_id
            GROUP BY p.id, p.titulo, p.created_at
            ORDER BY p.created_at DESC
        `);
        res.json(promotions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener una promoción por ID con sus productos
app.get('/api/promotions/:id', async (req, res) => {
    try {
        const promotionId = req.params.id;

        // Obtener promoción
        const promotion = await dbAll("SELECT * FROM promociones WHERE id = ?", [promotionId]);
        if (promotion.length === 0) {
            return res.status(404).json({ error: 'Promoción no encontrada' });
        }

        // Obtener items de la promoción
        const items = await dbAll(`
            SELECT
                pi.id,
                pi.producto_id,
                pi.descuento_porcentaje,
                pr.nombre as producto_nombre,
                pr.precio as precio_original
            FROM promocion_items pi
            JOIN productos pr ON pi.producto_id = pr.id
            WHERE pi.promocion_id = ?
        `, [promotionId]);

        res.json({
            ...promotion[0],
            items: items
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear nueva promoción
app.post('/api/promotions', async (req, res) => {
    const { titulo, items } = req.body;

    // Verificar límite de promociones sin licencia
    const isLicensed = await checkLicense();
    if (!isLicensed) {
        const activePromotions = await dbAll("SELECT COUNT(*) as count FROM promociones");
        if (activePromotions[0].count >= 3) {
            return res.status(403).json({
                error: 'Límite alcanzado',
                message: 'Sin licencia, solo puede tener hasta 3 promociones activas.',
                suggestion: 'Active una licencia para crear más promociones.',
                requiresLicense: true,
                activateUrl: '/activate'
            });
        }

        // En modo gratuito, solo 1 item por promoción
        if (items.length !== 1) {
            return res.status(400).json({
                error: 'Límite de promoción',
                message: 'En modo gratuito, cada promoción solo puede incluir 1 producto.',
                suggestion: 'Active una licencia para crear promociones con múltiples productos.',
                requiresLicense: true,
                activateUrl: '/activate'
            });
        }
    }

    // Validaciones
    if (!titulo || titulo.trim() === '') {
        return res.status(400).json({ error: 'El título de la promoción es requerido' });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'La promoción debe incluir al menos un producto' });
    }

    try {
        // Verificar que ningún producto ya esté en otra promoción activa
        const productIds = items.map(item => item.producto_id);
        if (productIds.length > 0) {
            const existingPromotions = await dbAll(`
                SELECT
                    pi.producto_id,
                    p.nombre as producto_nombre,
                    prom.titulo as promocion_titulo
                FROM promocion_items pi
                JOIN productos p ON pi.producto_id = p.id
                JOIN promociones prom ON pi.promocion_id = prom.id
                WHERE pi.producto_id IN (${productIds.map(() => '?').join(',')})
            `, productIds);

            if (existingPromotions.length > 0) {
                const conflicts = existingPromotions.map(ep =>
                    `"${ep.producto_nombre}" (ya en promoción: "${ep.promocion_titulo}")`
                ).join(', ');
                throw new Error(`Los siguientes productos ya están en otras promociones: ${conflicts}. Un producto no puede estar en múltiples promociones simultáneamente.`);
            }
        }

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        try {
            // Insertar promoción
            const promotionResult = await dbRun(
                "INSERT INTO promociones (titulo) VALUES (?)",
                [titulo.trim()]
            );

            // Insertar items de la promoción
            for (const item of items) {
                if (!item.producto_id || !item.descuento_porcentaje) {
                    throw new Error('Cada item debe tener producto_id y descuento_porcentaje');
                }

                const discount = parseFloat(item.descuento_porcentaje);
                if (isNaN(discount) || discount < 0 || discount > 100) {
                    throw new Error('El descuento debe ser un porcentaje válido entre 0 y 100');
                }

                await dbRun(
                    "INSERT INTO promocion_items (promocion_id, producto_id, descuento_porcentaje) VALUES (?, ?, ?)",
                    [promotionResult.id, item.producto_id, discount]
                );
            }

            await dbRun("COMMIT");

            // Registrar la operación en el log
            logOperation(
                'PROMOCION_CREADA',
                `Promoción creada: ${titulo} (${items.length} productos)`,
                'Sistema',
                'promociones',
                promotionResult.id,
                null,
                {
                    titulo,
                    productos: items.length,
                    descuentos: items.map(item => `${item.descuento_porcentaje}%`).join(', ')
                }
            );

            res.status(201).json({
                success: true,
                message: 'Promoción creada exitosamente',
                promotion_id: promotionResult.id
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error creando promoción:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Eliminar promoción
app.delete('/api/promotions/:id', async (req, res) => {
    try {
        const promotionId = req.params.id;

        // Verificar que la promoción existe
        const existingPromotion = await dbAll("SELECT * FROM promociones WHERE id = ?", [promotionId]);
        if (existingPromotion.length === 0) {
            return res.status(404).json({ error: 'Promoción no encontrada' });
        }

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        try {
            // Eliminar items de la promoción
            await dbRun("DELETE FROM promocion_items WHERE promocion_id = ?", [promotionId]);

            // Eliminar promoción
            await dbRun("DELETE FROM promociones WHERE id = ?", [promotionId]);

            await dbRun("COMMIT");

            res.json({
                success: true,
                message: 'Promoción eliminada exitosamente'
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error eliminando promoción:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Cancelar venta específica
app.delete('/api/sales/:id', async (req, res) => {
    try {
        const saleId = req.params.id;

        // Verificar que la venta existe
        const existingSale = await dbAll("SELECT * FROM ventas WHERE id = ?", [saleId]);
        if (existingSale.length === 0) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        const sale = existingSale[0];

        // Obtener los items de la venta para restaurar stock
        const saleItems = await dbAll("SELECT * FROM venta_items WHERE venta_id = ?", [saleId]);

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        try {
            // Restaurar stock de productos
            for (const item of saleItems) {
                await dbRun(
                    "UPDATE productos SET stock = stock + ? WHERE id = ?",
                    [item.cantidad, item.producto_id]
                );
            }

            // Eliminar items de la venta
            await dbRun("DELETE FROM venta_items WHERE venta_id = ?", [saleId]);

            // Eliminar la venta
            await dbRun("DELETE FROM ventas WHERE id = ?", [saleId]);

            await dbRun("COMMIT");

            // Registrar la operación en el log
            logOperation(
                'VENTA_CANCELADA',
                `Venta cancelada: ${sale.numero_factura} - Total: ${formatCurrency(sale.total)}`,
                'Sistema',
                'ventas',
                saleId,
                sale,
                null
            );

            res.json({
                success: true,
                message: 'Venta cancelada exitosamente. El stock ha sido restaurado.'
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error cancelando venta:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});


// >>> RUTAS PARA ÓRDENES DE COMPRA A PROVEEDORES

// Obtener todas las órdenes de compra
app.get('/api/purchase-orders', async (req, res) => {
    try {
        const orders = await dbAll(`
            SELECT
                oc.*,
                p.nombre_proveedor,
                p.nombre_contacto,
                p.telefono,
                p.email,
                COUNT(oi.id) as items_count,
                SUM(oi.subtotal) as total_calculado
            FROM ordenes_compra oc
            JOIN proveedores p ON oc.proveedor_id = p.id
            LEFT JOIN orden_items oi ON oc.id = oi.orden_id
            GROUP BY oc.id, p.nombre_proveedor, p.nombre_contacto, p.telefono, p.email
            ORDER BY oc.fecha_creacion DESC
        `);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener una orden de compra por ID con sus items
app.get('/api/purchase-orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;

        // Obtener orden
        const order = await dbAll(`
            SELECT
                oc.*,
                p.nombre_proveedor,
                p.nombre_contacto,
                p.telefono,
                p.email
            FROM ordenes_compra oc
            JOIN proveedores p ON oc.proveedor_id = p.id
            WHERE oc.id = ?
        `, [orderId]);

        if (order.length === 0) {
            return res.status(404).json({ error: 'Orden de compra no encontrada' });
        }

        // Obtener items de la orden
        const items = await dbAll(`
            SELECT
                oi.*,
                pr.nombre as producto_nombre,
                pr.codigo as producto_codigo,
                pr.categoria as producto_categoria
            FROM orden_items oi
            JOIN productos pr ON oi.producto_id = pr.id
            WHERE oi.orden_id = ?
            ORDER BY oi.id
        `, [orderId]);

        res.json({
            ...order[0],
            items: items
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear nueva orden de compra
app.post('/api/purchase-orders', async (req, res) => {
    const { proveedor_id, items, notas } = req.body;

    // Validaciones
    if (!proveedor_id) {
        return res.status(400).json({ error: 'El ID del proveedor es requerido' });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'La orden debe incluir al menos un item' });
    }

    try {
        // Verificar que el proveedor existe
        const supplier = await dbAll("SELECT id FROM proveedores WHERE id = ?", [proveedor_id]);
        if (supplier.length === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        // Calcular total y validar items
        let totalEsperado = 0;
        const processedItems = [];

        for (const item of items) {
            if (!item.producto_id || !item.cantidad_solicitada || !item.precio_unitario) {
                return res.status(400).json({ error: 'Cada item debe tener producto_id, cantidad_solicitada y precio_unitario' });
            }

            const cantidad = parseInt(item.cantidad_solicitada);
            const precio = parseFloat(item.precio_unitario);

            if (cantidad <= 0 || precio < 0) {
                return res.status(400).json({ error: 'Cantidad debe ser positiva y precio no negativo' });
            }

            const subtotal = cantidad * precio;
            totalEsperado += subtotal;

            processedItems.push({
                producto_id: item.producto_id,
                cantidad_solicitada: cantidad,
                precio_unitario: precio,
                subtotal: subtotal
            });
        }

        // Generar número de orden único
        const orderNumber = `OC-${Date.now()}`;

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        try {
            // Insertar orden de compra
            const orderResult = await dbRun(
                "INSERT INTO ordenes_compra (numero_orden, proveedor_id, notas, total_esperado) VALUES (?, ?, ?, ?)",
                [orderNumber, proveedor_id, notas || '', totalEsperado]
            );

            // Insertar items de la orden
            for (const item of processedItems) {
                await dbRun(
                    "INSERT INTO orden_items (orden_id, producto_id, cantidad_solicitada, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)",
                    [orderResult.id, item.producto_id, item.cantidad_solicitada, item.precio_unitario, item.subtotal]
                );
            }

            await dbRun("COMMIT");

            // Registrar la operación en el log
            logOperation(
                'ORDEN_COMPRA_CREADA',
                `Orden de compra creada: ${orderNumber} - Total: ${formatCurrency(totalEsperado)}`,
                'Sistema',
                'ordenes_compra',
                orderResult.id,
                null,
                {
                    numero_orden: orderNumber,
                    proveedor_id: proveedor_id,
                    total_esperado: totalEsperado,
                    items_count: processedItems.length
                }
            );

            res.status(201).json({
                success: true,
                message: 'Orden de compra creada exitosamente',
                order_id: orderResult.id,
                numero_orden: orderNumber
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error creando orden de compra:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Actualizar estado de orden de compra
app.put('/api/purchase-orders/:id/status', async (req, res) => {
    const { estado, fecha_envio, fecha_recepcion } = req.body;
    const orderId = req.params.id;

    const validStates = ['pendiente', 'enviada', 'recibida', 'cancelada'];
    if (!validStates.includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
    }

    try {
        // Verificar que la orden existe
        const existingOrder = await dbAll("SELECT * FROM ordenes_compra WHERE id = ?", [orderId]);
        if (existingOrder.length === 0) {
            return res.status(404).json({ error: 'Orden de compra no encontrada' });
        }

        // Construir consulta de actualización
        const updates = ["estado = ?"];
        const params = [estado];

        if (estado === 'enviada' && fecha_envio) {
            updates.push("fecha_envio = ?");
            params.push(fecha_envio);
        }

        if (estado === 'recibida' && fecha_recepcion) {
            updates.push("fecha_recepcion = ?");
            params.push(fecha_recepcion);

            // Si se marca como recibida, actualizar stock de productos
            if (estado === 'recibida') {
                const orderItems = await dbAll("SELECT * FROM orden_items WHERE orden_id = ?", [orderId]);
                for (const item of orderItems) {
                    await dbRun(
                        "UPDATE productos SET stock = stock + ? WHERE id = ?",
                        [item.cantidad_solicitada, item.producto_id]
                    );
                }
            }
        }

        params.push(orderId);
        const query = `UPDATE ordenes_compra SET ${updates.join(", ")} WHERE id = ?`;

        const result = await dbRun(query, params);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Orden de compra no encontrada' });
        }

        // Registrar la operación en el log
        logOperation(
            'ORDEN_COMPRA_ACTUALIZADA',
            `Estado de orden actualizado: ${existingOrder[0].numero_orden} → ${estado}`,
            'Sistema',
            'ordenes_compra',
            orderId,
            existingOrder[0],
            { estado, fecha_envio, fecha_recepcion }
        );

        res.json({
            success: true,
            message: 'Estado de orden actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando estado de orden:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Eliminar orden de compra
app.delete('/api/purchase-orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;

        // Verificar que la orden existe
        const existingOrder = await dbAll("SELECT * FROM ordenes_compra WHERE id = ?", [orderId]);
        if (existingOrder.length === 0) {
            return res.status(404).json({ error: 'Orden de compra no encontrada' });
        }

        const order = existingOrder[0];

        // Solo permitir eliminar órdenes pendientes
        if (order.estado !== 'pendiente') {
            return res.status(400).json({ error: 'Solo se pueden eliminar órdenes pendientes' });
        }

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        try {
            // Eliminar items de la orden
            await dbRun("DELETE FROM orden_items WHERE orden_id = ?", [orderId]);

            // Eliminar orden
            await dbRun("DELETE FROM ordenes_compra WHERE id = ?", [orderId]);

            await dbRun("COMMIT");

            res.json({
                success: true,
                message: 'Orden de compra eliminada exitosamente'
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error eliminando orden de compra:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Agregar item a orden existente
app.post('/api/purchase-orders/:id/items', async (req, res) => {
    const { producto_id, cantidad_solicitada, precio_unitario } = req.body;
    const orderId = req.params.id;

    if (!producto_id || !cantidad_solicitada || precio_unitario === undefined) {
        return res.status(400).json({ error: 'Producto, cantidad y precio son requeridos' });
    }

    try {
        // Verificar que la orden existe y está pendiente
        const order = await dbAll("SELECT * FROM ordenes_compra WHERE id = ? AND estado = 'pendiente'", [orderId]);
        if (order.length === 0) {
            return res.status(404).json({ error: 'Orden no encontrada o no está pendiente' });
        }

        const cantidad = parseInt(cantidad_solicitada);
        const precio = parseFloat(precio_unitario);
        const subtotal = cantidad * precio;

        // Insertar item
        await dbRun(
            "INSERT INTO orden_items (orden_id, producto_id, cantidad_solicitada, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)",
            [orderId, producto_id, cantidad, precio, subtotal]
        );

        // Actualizar total de la orden
        await dbRun(
            "UPDATE ordenes_compra SET total_esperado = total_esperado + ? WHERE id = ?",
            [subtotal, orderId]
        );

        res.json({
            success: true,
            message: 'Item agregado a la orden exitosamente'
        });

    } catch (error) {
        console.error('Error agregando item a orden:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Remover item de orden
app.delete('/api/purchase-orders/:orderId/items/:itemId', async (req, res) => {
    const { orderId, itemId } = req.params;

    try {
        // Verificar que la orden está pendiente
        const order = await dbAll("SELECT * FROM ordenes_compra WHERE id = ? AND estado = 'pendiente'", [orderId]);
        if (order.length === 0) {
            return res.status(404).json({ error: 'Orden no encontrada o no está pendiente' });
        }

        // Obtener subtotal del item antes de eliminarlo
        const item = await dbAll("SELECT subtotal FROM orden_items WHERE id = ? AND orden_id = ?", [itemId, orderId]);
        if (item.length === 0) {
            return res.status(404).json({ error: 'Item no encontrado en la orden' });
        }

        const subtotal = item[0].subtotal;

        // Eliminar item
        await dbRun("DELETE FROM orden_items WHERE id = ? AND orden_id = ?", [itemId, orderId]);

        // Actualizar total de la orden
        await dbRun(
            "UPDATE ordenes_compra SET total_esperado = total_esperado - ? WHERE id = ?",
            [subtotal, orderId]
        );

        res.json({
            success: true,
            message: 'Item removido de la orden exitosamente'
        });

    } catch (error) {
        console.error('Error removiendo item de orden:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Ruta para limpiar promociones con productos duplicados
app.post('/api/clean-duplicate-promotions', authMiddleware, async (req, res) => {
    try {
        // Encontrar productos que están en múltiples promociones
        const duplicateProducts = await dbAll(`
            SELECT
                pi.producto_id,
                p.nombre as producto_nombre,
                COUNT(pi.promocion_id) as promociones_count,
                GROUP_CONCAT(prom.titulo) as promociones_titulos,
                GROUP_CONCAT(pi.promocion_id) as promociones_ids
            FROM promocion_items pi
            JOIN productos p ON pi.producto_id = p.id
            JOIN promociones prom ON pi.promocion_id = prom.id
            GROUP BY pi.producto_id, p.nombre
            HAVING COUNT(pi.promocion_id) > 1
            ORDER BY p.nombre
        `);

        if (duplicateProducts.length === 0) {
            return res.json({
                success: true,
                message: 'No se encontraron productos en múltiples promociones',
                cleaned: 0
            });
        }

        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        let totalCleaned = 0;

        try {
            for (const duplicate of duplicateProducts) {
                const promocionesIds = duplicate.promociones_ids.split(',');
                const promocionesTitulos = duplicate.promociones_titulos.split(',');

                // Mantener la promoción más antigua (primera creada) y eliminar las demás
                const oldestPromotionId = promocionesIds[0]; // Asumiendo que están ordenados por ID

                // Eliminar items de promociones más nuevas para este producto
                for (let i = 1; i < promocionesIds.length; i++) {
                    await dbRun(
                        "DELETE FROM promocion_items WHERE promocion_id = ? AND producto_id = ?",
                        [promocionesIds[i], duplicate.producto_id]
                    );
                    totalCleaned++;
                }

                console.log(`Producto "${duplicate.producto_nombre}" limpiado: mantenido en "${promocionesTitulos[0]}", removido de ${promocionesIds.length - 1} promociones`);
            }

            await dbRun("COMMIT");

            // Registrar la operación de limpieza
            logOperation(
                'PROMOCIONES_LIMPIADAS',
                `Se limpiaron ${totalCleaned} productos duplicados de promociones`,
                'Sistema',
                'promociones',
                null,
                null,
                {
                    productos_afectados: duplicateProducts.length,
                    items_removidos: totalCleaned
                }
            );

            res.json({
                success: true,
                message: `Se limpiaron ${totalCleaned} productos duplicados de ${duplicateProducts.length} productos afectados`,
                cleaned: totalCleaned,
                affected_products: duplicateProducts.length,
                details: duplicateProducts.map(dp => ({
                    producto: dp.producto_nombre,
                    promociones_antes: dp.promociones_count,
                    mantenido_en: dp.promociones_titulos.split(',')[0]
                }))
            });

        } catch (error) {
            await dbRun("ROLLBACK");
            throw error;
        }

    } catch (error) {
        console.error('Error limpiando promociones duplicadas:', error);
        res.status(500).json({
            error: 'Error al limpiar promociones duplicadas: ' + error.message
        });
    }
});

// Ruta de diagnóstico
app.get('/api/diagnostic', async (req, res) => {
    try {
        const productCount = await dbAll("SELECT COUNT(*) as count FROM productos");
        const salesCount = await dbAll("SELECT COUNT(*) as count FROM ventas");

        res.json({
            database: 'SQLite',
            file: 'pos_database.sqlite',
            total_products: productCount[0].count,
            total_sales: salesCount[0].count,
            status: 'OK',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            database: 'SQLite',
            status: 'ERROR'
        });
    }
});

// Ruta para establecer hora del sistema
app.post('/api/set-time', authMiddleware, (req, res) => {
    const { date, time } = req.body;
    if (!date || !time) {
        return res.status(400).json({ error: 'Fecha y hora son requeridas' });
    }

    // Convertir formato: date es YYYY-MM-DD, time es HH:MM
    const dateTimeStr = `${date}T${time}:00`; // YYYY-MM-DDTHH:MM:00
    const psCommand = `Set-Date -Date "${dateTimeStr}"`;

    console.log('🕒 Setting system date/time to:', dateTimeStr);

    // Ejecutar comando PowerShell
    exec(`powershell -Command "${psCommand}"`, (error, stdout, stderr) => {
        if (error) {
            console.error('Error setting date/time:', error);
            let errorMsg = 'Error al establecer fecha/hora: ' + error.message;
            if (error.message.includes('privilegio requerido')) {
                errorMsg += '. Asegúrese de ejecutar el servidor como administrador.';
            }
            return res.status(500).json({ error: errorMsg });
        }
        console.log('Date/time set successfully');
        res.json({ success: true, message: 'Hora del sistema actualizada correctamente' });
    });
});

// Rutas para servir páginas HTML (AGREGADO)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/dashboard.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`🌐 También disponible en la red local (reemplaza localhost con tu IP)`);
    console.log(`📦 API disponible en http://localhost:${PORT}/api/products`);
    console.log(`📊 Estadísticas: http://localhost:${PORT}/api/stats`);
    console.log(`🔧 Diagnóstico: http://localhost:${PORT}/api/diagnostic`);
    console.log(`💾 Base de datos: ${dbPath}`);
    console.log(`🌐 Frontend disponible en http://localhost:${PORT}`);

    // Verificar licencias expiradas al iniciar (solo para logging)
    setTimeout(checkExpiredLicenses, 2000);
});

// Cerrar conexión al terminar
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('✅ Conexión a la base de datos cerrada');
        process.exit(0);
    });
});
