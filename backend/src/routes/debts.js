/**
 * Debts Routes - API endpoints for debt management
 */

import express from 'express';
import { dbGet, dbAll, dbRun } from '../config/database.js';

const router = express.Router();

// Helper for async route handlers
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/deudas - Get all debts
router.get('/', asyncHandler(async (req, res) => {
  const { cliente_id, estado, limit = 100, offset = 0 } = req.query;
  
  let query = `
    SELECT d.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono,
      (SELECT COUNT(*) FROM deuda_productos WHERE deuda_id = d.id) as items_count
    FROM deudas d
    LEFT JOIN clientes c ON d.cliente_id = c.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (cliente_id) {
    query += ' AND d.cliente_id = ?';
    params.push(cliente_id);
  }
  
  if (estado) {
    query += ' AND d.estado = ?';
    params.push(estado);
  }
  
  query += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  const debts = await dbAll(query, params);
  
  // Map the results to add tipo and saldo for frontend compatibility
  const mappedDebts = debts.map(d => ({
    ...d,
    tipo: d.estado === 'pagado' ? 'pago' : 'compra',
    monto: d.monto_pendiente || d.monto_total,
    saldo: d.monto_pendiente
  }));
  
  res.json(mappedDebts);
}));

// GET /api/deudas/:id - Get debt by ID with products
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const debt = await dbGet(`
    SELECT d.*, c.nombre as cliente_nombre
    FROM deudas d
    LEFT JOIN clientes c ON d.cliente_id = c.id
    WHERE d.id = ?
  `, [id]);
  
  if (!debt) {
    return res.status(404).json({ error: 'Deuda no encontrada' });
  }
  
  const products = await dbAll(`
    SELECT dp.*, p.nombre, p.codigo, p.codigo_barras
    FROM deuda_productos dp
    JOIN productos p ON dp.producto_id = p.id
    WHERE dp.deuda_id = ?
  `, [id]);
  
  res.json({ ...debt, productos: products });
}));

// POST /api/deudas/:id/pago - Record a payment
router.post('/:id/pago', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { monto, metodo_pago = 'efectivo' } = req.body;
  
  const debt = await dbGet('SELECT * FROM deudas WHERE id = ?', [id]);
  
  if (!debt) {
    return res.status(404).json({ error: 'Deuda no encontrada' });
  }
  
  if (debt.pagado) {
    return res.status(400).json({ error: 'La deuda ya está pagada' });
  }
  
  const montoPago = parseFloat(monto) || debt.monto_pendiente;
  
  await dbRun(`
    INSERT INTO deuda_pagos (deuda_id, fecha, monto, metodo_pago)
    VALUES (?, datetime('now'), ?, ?)
  `, [id, montoPago, metodo_pago]);
  
  const nuevoPendiente = debt.monto_pendiente - montoPago;
  const estado = nuevoPendiente <= 0 ? 'pagado' : 'pendiente';
  
  await dbRun(`
    UPDATE deudas SET monto_pendiente = ?, estado = ? WHERE id = ?
  `, [Math.max(0, nuevoPendiente), estado, id]);
  
  const updatedDebt = await dbGet('SELECT * FROM deudas WHERE id = ?', [id]);
  
  res.json({
    message: 'Pago registrado',
    debt: updatedDebt,
    monto_pagado: montoPago
  });
}));

export default router;
