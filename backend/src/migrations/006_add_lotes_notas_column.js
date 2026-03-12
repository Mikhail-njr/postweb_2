/**
 * Migration: Add notas column to lotes table
 * Date: 2026-03-11
 */

import { dbGet, dbRun } from '../config/database.js';

export async function up() {
  // Check if column exists
  const tableInfo = await dbGet("PRAGMA table_info(lotes)");
  const columns = tableInfo.map(col => col.name);
  
  if (!columns.includes('notas')) {
    await dbRun("ALTER TABLE lotes ADD COLUMN notas TEXT");
    console.log("✓ Column 'notas' added to 'lotes' table");
  } else {
    console.log("✓ Column 'notas' already exists in 'lotes' table");
  }
}

export async function down() {
  // SQLite doesn't support DROP COLUMN easily, but we can document this
  console.log("Note: Cannot easily remove column in SQLite without table recreation");
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  up().then(() => {
    console.log("Migration completed");
    process.exit(0);
  }).catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}
