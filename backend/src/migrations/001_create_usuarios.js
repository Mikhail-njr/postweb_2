/**
 * Migration: Create usuarios table
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../../data/pos.db');

const db = new sqlite3.Database(DB_PATH);

console.log('Creating usuarios table...');

db.run(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'cajero',
    nombre TEXT,
    email TEXT,
    activo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('Error creating usuarios table:', err);
    db.close();
    return;
  }
  
  console.log('usuarios table created successfully');
  
  // Insert default admin user if not exists
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  
  db.run(`
    INSERT OR IGNORE INTO usuarios (username, password, role, nombre)
    VALUES (?, ?, ?, ?)
  `, ['admin', hashedPassword, 'admin', 'Administrador'], (err) => {
    if (err) {
      console.error('Error inserting default user:', err);
    } else {
      console.log('Default admin user created: admin / admin123');
    }
    db.close();
  });
});
