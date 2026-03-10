/**
 * Lotes (Product Lots) Routes
 */

import express from 'express';
import { dbGet, dbAll, dbRun } from '../config/database.js';

const router = express.Router();

// Helper for async route handlers
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Helper function to update product stock from active (non-expired) lots
async function updateProductStock(producto_id) {
  // Calculate stock from active lots that haven't expired (with -3 hours buffer)
  const result = await dbGet(`
    SELECT COALESCE(SUM(
      CASE WHEN estado = 'activo' AND DATE(fecha_vencimiento) >= DATE('now', '-3 hours') 
      THEN cantidad_actual ELSE 0 END
    ), 0) as stock
    FROM lotes
    WHERE producto_id = ?
  `, [producto_id]);
  
  await dbRun('UPDATE productos SET stock = ? WHERE id = ?', [result.stock, producto_id]);
}

// GET /api/lotes/suggest - Get suggested lot number based on last created lot
router.get('/suggest', asyncHandler(async (req, res) => {
  const { producto_id } = req.query;
  
  let suggested_lote = 'LOTE-001';
  let suggested_date = new Date().toISOString().split('T')[0];
  
  // Get the last created lot
  const lastLote = await dbGet(`
    SELECT numero_lote, fecha_vencimiento 
    FROM lotes 
    ORDER BY id DESC 
    LIMIT 1
  `);
  
  if (lastLote && lastLote.numero_lote) {
    // Parse the last lot number - format: LOTE-XXX-PRODUCTO_ID-RANDOM or just LOTE-XXX
    const match = lastLote.numero_lote.match(/LOTE-(\d+)/);
    if (match) {
      const lastNum = parseInt(match[1], 10);
      const nextNum = lastNum + 1;
      suggested_lote = `LOTE-${nextNum.toString().padStart(3, '0')}`;
    }
    // Use the same date pattern if available
    if (lastLote.fecha_vencimiento) {
      suggested_date = lastLote.fecha_vencimiento;
    }
  }
  
  // If producto_id is provided, append it to the lot number
  if (producto_id) {
    suggested_lote = `${suggested_lote}-${producto_id}-${Date.now().toString().slice(-4)}`;
  }
  
  res.json({ suggested_lote, suggested_date });
}));

// GET /api/lotes - Get all lots
router.get('/', asyncHandler(async (req, res) => {
  const { producto_id, estado } = req.query;
  
  let query = `
    SELECT l.*, p.nombre as producto_nombre, p.codigo as producto_codigo
    FROM lotes l
    LEFT JOIN productos p ON l.producto_id = p.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (producto_id) {
    query += ' AND l.producto_id = ?';
    params.push(producto_id);
  }
  
  if (estado) {
    query += ' AND l.estado = ?';
    params.push(estado);
  }
  
  query += ' ORDER BY l.fecha_vencimiento ASC';
  
  const lotes = await dbAll(query, params);
  res.json(lotes);
}));

// GET /api/lotes/:id - Get lot by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const lote = await dbGet(`
    SELECT l.*, p.nombre as producto_nombre, p.codigo as producto_codigo
    FROM lotes l
    LEFT JOIN productos p ON l.producto_id = p.id
    WHERE l.id = ?
  `, [id]);
  
  if (!lote) {
    return res.status(404).json({ error: 'Lote no encontrado' });
  }
  
  res.json(lote);
}));

// POST /api/lotes - Create new lot
router.post('/', asyncHandler(async (req, res) => {
  const { producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual, costo_unitario, notas } = req.body;
  
  const result = await dbRun(`
    INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual, costo_unitario, notas, estado, fecha_ingreso)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'activo', datetime('now', '-3 hours'))
  `, [producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual || cantidad_inicial, costo_unitario, notas || null]);
  
  await dbRun('UPDATE productos SET lote_actual_id = ? WHERE id = ?', [result.lastID, producto_id]);
  
  // Update product stock from lots
  await updateProductStock(producto_id);
  
  const lote = await dbGet('SELECT * FROM lotes WHERE id = ?', [result.lastID]);
  res.status(201).json(lote);
}));

// PUT /api/lotes/:id - Update lot
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { numero_lote, fecha_vencimiento, cantidad_actual, estado, notas } = req.body;
  
  // Get the lot first to know the producto_id
  const existingLote = await dbGet('SELECT producto_id FROM lotes WHERE id = ?', [id]);
  
  if (!existingLote) {
    return res.status(404).json({ error: 'Lote no encontrado' });
  }
  
  await dbRun(`
    UPDATE lotes SET numero_lote = ?, fecha_vencimiento = ?, cantidad_actual = ?, estado = ?, notas = ?
    WHERE id = ?
  `, [numero_lote, fecha_vencimiento, cantidad_actual, estado, notas || null, id]);
  
  // Update product stock from lots
  await updateProductStock(existingLote.producto_id);
  
  const lote = await dbGet('SELECT * FROM lotes WHERE id = ?', [id]);
  res.json(lote);
}));

// DELETE /api/lotes/:id - Delete lot
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Get the lot first to know the producto_id
  const existingLote = await dbGet('SELECT producto_id FROM lotes WHERE id = ?', [id]);
  
  if (existingLote) {
    await dbRun('DELETE FROM lotes WHERE id = ?', [id]);
    
    // Update product stock from lots
    await updateProductStock(existingLote.producto_id);
  }
  
  res.json({ message: 'Lote eliminado' });
}));

export default router;
