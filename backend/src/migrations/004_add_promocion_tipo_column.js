/**
 * Migration: Add tipo column to promociones table
 * Supports 'combo' and 'individual' promotion types
 */

import { dbRun, dbAll } from '../config/database.js';

export async function addPromocionTipoColumn() {
  console.log('🔄 Running promotions migration...');
  
  try {
    // First check if table exists
    const tables = await dbAll("SELECT name FROM sqlite_master WHERE type='table' AND name='promociones'");
    
    if (tables.length === 0) {
      // Create the table if it doesn't exist
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
    }
    
    // Get current table structure
    const tableInfo = await dbAll("PRAGMA table_info(promociones)");
    
    // Add tipo column if not exists - use try-catch to handle SQLite issues
    const columnExists = tableInfo && Array.isArray(tableInfo) && tableInfo.some(col => col.name === 'tipo');
    
    if (!columnExists) {
      try {
        await dbRun(`ALTER TABLE promociones ADD COLUMN tipo TEXT`);
        await dbRun(`UPDATE promociones SET tipo = 'individual' WHERE tipo IS NULL`);
        console.log('✅ Added "tipo" column to promociones');
      } catch (e) {
        console.log('⚠️ Could not add "tipo" column:', e.message);
      }
    }
    
    // Add fecha_inicio column if not exists
    const hasFechaInicio = tableInfo && Array.isArray(tableInfo) && tableInfo.some(col => col.name === 'fecha_inicio');
    
    if (!hasFechaInicio) {
      try {
        await dbRun(`ALTER TABLE promociones ADD COLUMN fecha_inicio TEXT`);
        console.log('✅ Added "fecha_inicio" column to promociones');
      } catch (e) {
        console.log('⚠️ Could not add "fecha_inicio" column:', e.message);
      }
    }
    
    // Add fecha_fin column if not exists
    const hasFechaFin = tableInfo && Array.isArray(tableInfo) && tableInfo.some(col => col.name === 'fecha_fin');
    
    if (!hasFechaFin) {
      try {
        await dbRun(`ALTER TABLE promociones ADD COLUMN fecha_fin TEXT`);
        console.log('✅ Added "fecha_fin" column to promociones');
      } catch (e) {
        console.log('⚠️ Could not add "fecha_fin" column:', e.message);
      }
    }
    
    // Check if промоции_продуктос table exists
    const ppTables = await dbAll("SELECT name FROM sqlite_master WHERE type='table' AND name='promociones_productos'");
    
    if (ppTables.length === 0) {
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
    } else {
      // Check if cantidad column exists
      const ppTableInfo = await dbAll("PRAGMA table_info(promociones_productos)");
      const cantidadExists = ppTableInfo && Array.isArray(ppTableInfo) && ppTableInfo.some(col => col.name === 'cantidad');
      
      if (!cantidadExists) {
        try {
          await dbRun(`ALTER TABLE promociones_productos ADD COLUMN cantidad INTEGER`);
          console.log('✅ Added "cantidad" column to promociones_productos');
        } catch (e) {
          console.log('⚠️ Could not add "cantidad" column:', e.message);
        }
      }
    }
    
    console.log('✅ Promotions migration completed');
  } catch (error) {
    console.error('❌ Promotions migration error:', error.message);
  }
}
