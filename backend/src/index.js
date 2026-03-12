/**
 * POS Backend - Entry Point
 * Modular API Server
 */

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { logger } from './middleware/logger.js';
import { dbAll, dbRun } from './config/database.js';
import { addPromocionTipoColumn } from './migrations/004_add_promocion_tipo_column.js';
import { seedProducts } from './migrations/005_seed_data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Run migrations on startup
async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  try {
    // First, create base tables if they don't exist
    
    // Create productos table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        precio REAL NOT NULL DEFAULT 0,
        stock INTEGER DEFAULT 0,
        categoria TEXT,
        codigo_barras TEXT,
        activo INTEGER DEFAULT 1,
        lote_actual_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created "productos" table');
    
    // Create usuarios table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nombre TEXT NOT NULL,
        rol TEXT DEFAULT 'cajero',
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created "usuarios" table');
    
    // Create clientes table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        telefono TEXT,
        email TEXT,
        direccion TEXT,
        observaciones TEXT,
        dni TEXT,
        fecha_alta DATETIME DEFAULT CURRENT_TIMESTAMP,
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created "clientes" table');
    
    // Create ventas table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero_factura TEXT UNIQUE,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        total REAL NOT NULL DEFAULT 0,
        metodo_pago TEXT DEFAULT 'efectivo',
        cliente_id INTEGER,
        usuario_id INTEGER,
        observaciones TEXT,
        estado TEXT DEFAULT 'completada',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);
    console.log('✅ Created "ventas" table');
    
    // Create venta_items table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS venta_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venta_id INTEGER NOT NULL,
        producto_id INTEGER NOT NULL,
        cantidad INTEGER NOT NULL,
        precio_unitario REAL NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `);
    console.log('✅ Created "venta_items" table');
    
    // Create lotes table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS lotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        producto_id INTEGER NOT NULL,
        numero_lote TEXT,
        fecha_vencimiento DATETIME,
        cantidad_inicial INTEGER NOT NULL,
        cantidad_actual INTEGER NOT NULL,
        costo_unitario REAL,
        estado TEXT DEFAULT 'activo',
        notas TEXT,
        fecha_ingreso DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `);
    console.log('✅ Created "lotes" table');
    
    // Create deudas table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS deudas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        monto_original REAL NOT NULL DEFAULT 0,
        monto_pendiente REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        estado TEXT DEFAULT 'pendiente',
        observaciones TEXT,
        fecha_vencimiento DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      )
    `);
    console.log('✅ Created "deudas" table');
    
    // Create deuda_productos table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS deuda_productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deuda_id INTEGER NOT NULL,
        producto_id INTEGER NOT NULL,
        cantidad INTEGER NOT NULL,
        precio_unitario REAL NOT NULL,
        pagado INTEGER DEFAULT 0,
        FOREIGN KEY (deuda_id) REFERENCES deudas(id) ON DELETE CASCADE,
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `);
    console.log('✅ Created "deuda_productos" table');
    
    // Create cierres_caja table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS cierres_caja (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha_apertura DATETIME NOT NULL,
        fecha_cierre DATETIME,
        monto_inicial REAL NOT NULL,
        monto_final REAL,
        ventas_total REAL DEFAULT 0,
        egresos_total REAL DEFAULT 0,
        diferencia REAL,
        observaciones TEXT,
        estado TEXT DEFAULT 'abierta',
        usuario_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);
    console.log('✅ Created "cierres_caja" table');
    
    // Create promociones table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS promociones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        descuento REAL NOT NULL DEFAULT 0,
        fecha_inicio TEXT,
        fecha_fin TEXT,
        activa INTEGER DEFAULT 1,
        tipo TEXT DEFAULT 'individual',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created "promociones" table');
    
    // Create promociones_productos table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS promociones_productos (
        promocion_id INTEGER NOT NULL,
        producto_id INTEGER NOT NULL,
        cantidad INTEGER DEFAULT 1,
        PRIMARY KEY (promocion_id, producto_id),
        FOREIGN KEY (promocion_id) REFERENCES promociones(id) ON DELETE CASCADE,
        FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created "promociones_productos" table');
    
    // Database schema is now complete with all columns defined at creation
    // No additional migrations needed - all columns are included in table definitions
    
    // Run promotions migration (if needed)
    await addPromocionTipoColumn();
    
    // Seed sample products
    await seedProducts();
    
    console.log('✅ Database schema initialized with all columns');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(logger);

// API Routes
app.use('/api', routes);

// Serve static frontend in production
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Error handling
app.use(errorHandler);

app.listen(PORT, async () => {
  await runMigrations();
  console.log(`🚀 POS API Server running on http://localhost:${PORT}`);
});

export default app;
