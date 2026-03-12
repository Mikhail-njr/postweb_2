/**
 * Migration: Fix debts table columns
 * Ensures all required columns exist in the deudas table
 */

import db from '../config/database.js';

function run(sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function all(sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function migrate() {
  console.log('Running migration: Fix debts table columns...');
  
  try {
    // Get current table structure
    const tableInfo = await all("PRAGMA table_info(deudas)");
    const columns = tableInfo.map(col => col.name);
    
    console.log('Current columns:', columns);
    
    // Add monto_total if doesn't exist
    if (!columns.includes('monto_total')) {
      await run(`ALTER TABLE deudas ADD COLUMN monto_total REAL DEFAULT 0`);
      console.log('✅ Column "monto_total" added to deudas table');
    } else {
      console.log('✅ Column "monto_total" already exists');
    }
    
    // Add estado if doesn't exist (should exist from migration 002)
    if (!columns.includes('estado')) {
      await run(`ALTER TABLE deudas ADD COLUMN estado TEXT DEFAULT 'pendiente'`);
      console.log('✅ Column "estado" added to deudas table');
    } else {
      console.log('✅ Column "estado" already exists');
    }
    
    // Ensure deuda_productos has pagado column
    const dpTableInfo = await all("PRAGMA table_info(deuda_productos)");
    const dpColumns = dpTableInfo.map(col => col.name);
    
    if (!dpColumns.includes('pagado')) {
      await run(`ALTER TABLE deuda_productos ADD COLUMN pagado INTEGER DEFAULT 0`);
      console.log('✅ Column "pagado" added to deuda_productos table');
    } else {
      console.log('✅ Column "pagado" already exists in deuda_productos');
    }
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  }
  
  process.exit(0);
}

migrate();
