/**
 * Promotions Routes - API endpoints for promotions management
 */

import express from 'express';
import { dbGet, dbAll, dbRun } from '../config/database.js';

const router = express.Router();

// Helper for async route handlers
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/promotions - Get all promotions
router.get('/', asyncHandler(async (req, res) => {
  const { activa } = req.query;
  
  let query = 'SELECT * FROM promociones';
  const params = [];
  
  if (activa !== undefined) {
    query += ' WHERE activa = ?';
    params.push(activa === 'true' ? 1 : 0);
  }
  
  query += ' ORDER BY fecha_inicio DESC';
  
  const promotions = await dbAll(query, params);
  res.json(promotions);
}));

// GET /api/promotions/:id - Get promotion by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const promotion = await dbGet('SELECT * FROM promociones WHERE id = ?', [id]);
  
  if (!promotion) {
    return res.status(404).json({ error: 'Promoción no encontrada' });
  }
  
  const products = await dbAll(`
    SELECT p.*, pp.descuento as descuento_promocion
    FROM productos p
    JOIN promociones_productos pp ON p.id = pp.producto_id
    WHERE pp.promocion_id = ?
  `, [id]);
  
  res.json({ ...promotion, productos: products });
}));

// POST /api/promotions - Create new promotion
router.post('/', asyncHandler(async (req, res) => {
  const { nombre, descripcion, descuento, fecha_inicio, fecha_fin, activa } = req.body;
  
  const result = await dbRun(`
    INSERT INTO promociones (nombre, descripcion, descuento, fecha_inicio, fecha_fin, activa)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [nombre, descripcion, descuento, fecha_inicio, fecha_fin, activa ? 1 : 0]);
  
  const promotion = await dbGet('SELECT * FROM promociones WHERE id = ?', [result.lastID]);
  res.status(201).json(promotion);
}));

// PUT /api/promotions/:id - Update promotion
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, descuento, fecha_inicio, fecha_fin, activa } = req.body;
  
  await dbRun(`
    UPDATE promociones SET nombre = ?, descripcion = ?, descuento = ?, fecha_inicio = ?, fecha_fin = ?, activa = ?
    WHERE id = ?
  `, [nombre, descripcion, descuento, fecha_inicio, fecha_fin, activa ? 1 : 0, id]);
  
  const promotion = await dbGet('SELECT * FROM promociones WHERE id = ?', [id]);
  res.json(promotion);
}));

// DELETE /api/promotions/:id - Delete promotion
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await dbRun('DELETE FROM promociones_productos WHERE promocion_id = ?', [id]);
  await dbRun('DELETE FROM promociones WHERE id = ?', [id]);
  res.json({ message: 'Promoción eliminada' });
}));

export default router;
