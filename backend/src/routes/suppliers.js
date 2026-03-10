/**
 * Suppliers Routes - API endpoints for supplier management
 */

import express from 'express';
import { dbGet, dbAll, dbRun } from '../config/database.js';

const router = express.Router();

// Helper for async route handlers
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/suppliers - Get all suppliers
router.get('/', asyncHandler(async (req, res) => {
  const suppliers = await dbAll('SELECT * FROM proveedores ORDER BY nombre ASC');
  res.json(suppliers);
}));

// GET /api/suppliers/search - Search suppliers
router.get('/search', asyncHandler(async (req, res) => {
  const { q } = req.query;
  const suppliers = await dbAll(`
    SELECT * FROM proveedores 
    WHERE nombre LIKE ? OR telefono LIKE ? OR email LIKE ?
    ORDER BY nombre LIMIT 20
  `, [`%${q}%`, `%${q}%`, `%${q}%`]);
  res.json(suppliers);
}));

// GET /api/suppliers/:id - Get supplier by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const supplier = await dbGet('SELECT * FROM proveedores WHERE id = ?', [id]);
  
  if (!supplier) {
    return res.status(404).json({ error: 'Proveedor no encontrado' });
  }
  
  res.json(supplier);
}));

// POST /api/suppliers - Create new supplier
router.post('/', asyncHandler(async (req, res) => {
  const { nombre, telefono, email, direccion, observaciones } = req.body;
  
  const result = await dbRun(`
    INSERT INTO proveedores (nombre, telefono, email, direccion, observaciones, fecha_alta)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `, [nombre, telefono, email, direccion, observaciones]);
  
  const supplier = await dbGet('SELECT * FROM proveedores WHERE id = ?', [result.lastID]);
  res.status(201).json(supplier);
}));

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nombre, telefono, email, direccion, observaciones } = req.body;
  
  await dbRun(`
    UPDATE proveedores SET nombre = ?, telefono = ?, email = ?, direccion = ?, observaciones = ?
    WHERE id = ?
  `, [nombre, telefono, email, direccion, observaciones, id]);
  
  const supplier = await dbGet('SELECT * FROM proveedores WHERE id = ?', [id]);
  res.json(supplier);
}));

// DELETE /api/suppliers/:id - Delete supplier
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await dbRun('DELETE FROM proveedores WHERE id = ?', [id]);
  res.json({ message: 'Proveedor eliminado' });
}));

export default router;
