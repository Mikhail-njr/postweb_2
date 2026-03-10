/**
 * Migration: Add 'pagado' column to deuda_productos table
 * Run this once to add the column if it doesn't exist
 */

import db from '../config/database.js';

async function migrate() {
  console.log('Running migration: Add pagado column to deuda_productos...');
  
  try {
    // Check if column exists
    const tableInfo = await db.all("PRAGMA table_info(deuda_productos)");
    const columnExists = tableInfo.some(col => col.name === 'pagado');
    
    if (!columnExists) {
      await db.run(`
        ALTER TABLE deuda_productos ADD COLUMN pagado INTEGER DEFAULT 0
      `);
      console.log('✅ Column "pagado" added to deuda_productos table');
    } else {
      console.log('✅ Column "pagado" already exists in deuda_productos table');
    }
    
    // Also ensure the debts table has the right columns
    const debtTableInfo = await db.all("PRAGMA table_info(deudas)");
    
    const hasEstado = debtTableInfo.some(col => col.name === 'estado');
    if (!hasEstado) {
      await db.run(`ALTER TABLE deudas ADD COLUMN estado TEXT DEFAULT 'pendiente'`);
      console.log('✅ Column "estado" added to deudas table');
    }
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  }
  
  process.exit(0);
}

migrate();
