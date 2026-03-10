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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Run migrations on startup
async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  try {
    // Add 'pagado' column to deuda_productos if not exists
    const tableInfo = await dbAll("PRAGMA table_info(deuda_productos)");
    const columnExists = tableInfo && Array.isArray(tableInfo) && tableInfo.some(col => col.name === 'pagado');
    
    if (!columnExists) {
      await dbRun(`ALTER TABLE deuda_productos ADD COLUMN pagado INTEGER DEFAULT 0`);
      console.log('✅ Added "pagado" column to deuda_productos');
    }
    
    // Add 'estado' column to deudas if not exists
    const debtTableInfo = await dbAll("PRAGMA table_info(deudas)");
    const hasEstado = debtTableInfo && Array.isArray(debtTableInfo) && debtTableInfo.some(col => col.name === 'estado');
    
    if (!hasEstado) {
      await dbRun(`ALTER TABLE deudas ADD COLUMN estado TEXT DEFAULT 'pendiente'`);
      console.log('✅ Added "estado" column to deudas');
    }
    
    // Add 'fecha' column to deudas if not exists
    const hasFecha = debtTableInfo && Array.isArray(debtTableInfo) && debtTableInfo.some(col => col.name === 'fecha');
    
    if (!hasFecha) {
      await dbRun(`ALTER TABLE deudas ADD COLUMN fecha DATETIME DEFAULT CURRENT_TIMESTAMP`);
      console.log('✅ Added "fecha" column to deudas');
    }
    
    // Create deuda_pagos table if not exists
    await dbRun(`
      CREATE TABLE IF NOT EXISTS deuda_pagos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deuda_id INTEGER NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        monto REAL NOT NULL,
        metodo_pago TEXT DEFAULT 'efectivo',
        FOREIGN KEY (deuda_id) REFERENCES deudas(id)
      )
    `);
    console.log('✅ Created "deuda_pagos" table');
    
    console.log('✅ Database migrations completed');
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
