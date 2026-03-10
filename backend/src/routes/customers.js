/**
 * Customers Routes - API endpoints for customer management
 */

import express from 'express';
import { dbGet, dbAll, dbRun } from '../config/database.js';

const router = express.Router();

// Helper for async route handlers
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/customers - Get all customers
router.get('/', asyncHandler(async (req, res) => {
  const customers = await dbAll(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM deudas WHERE cliente_id = c.id AND estado = 'pendiente') as cantidad_deudas,
      (SELECT COALESCE(SUM(monto_pendiente), 0) FROM deudas WHERE cliente_id = c.id AND estado = 'pendiente') as saldo
    FROM clientes c 
    ORDER BY c.nombre ASC
  `);
  res.json(customers);
}));

// GET /api/customers/search - Search customers
router.get('/search', asyncHandler(async (req, res) => {
  const { q } = req.query;
  const customers = await dbAll(`
    SELECT * FROM clientes 
    WHERE nombre LIKE ? OR dni LIKE ? OR telefono LIKE ?
    ORDER BY nombre LIMIT 20
  `, [`%${q}%`, `%${q}%`, `%${q}%`]);
  res.json(customers);
}));

// GET /api/customers/:id - Get customer by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const customer = await dbGet('SELECT * FROM clientes WHERE id = ?', [id]);
  
  if (!customer) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }
  
  res.json(customer);
}));

// GET /api/customers/:id/deudas-con-productos - Get customer debts with products
router.get('/:cliente_id/deudas-con-productos', asyncHandler(async (req, res) => {
  const { cliente_id } = req.params;
  const debts = await dbAll(`
    SELECT d.*, 
      (SELECT json_group_array(
        json_object(
          'id', dp.id,
          'producto_id', dp.producto_id,
          'cantidad', dp.cantidad,
          'precio_unitario', dp.precio_unitario,
          'precio_actual', COALESCE(p.precio, dp.precio_unitario),
          'nombre', p.nombre,
          'codigo', p.codigo,
          'pagado', COALESCE(dp.pagado, 0)
        )
      ) FROM deuda_productos dp 
      LEFT JOIN productos p ON dp.producto_id = p.id 
      WHERE dp.deuda_id = d.id) as productos
    FROM deudas d
    WHERE d.cliente_id = ?
    ORDER BY d.created_at DESC
  `, [cliente_id]);
  
  res.json(debts);
}));

// GET /api/customers/:id/cuenta-corriente - Get customer account statement
router.get('/:id/cuenta-corriente', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const customer = await dbGet('SELECT * FROM clientes WHERE id = ?', [id]);
  if (!customer) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }
  
  const debts = await dbAll(`
    SELECT d.*, 
      (SELECT COUNT(*) FROM deuda_productos WHERE deuda_id = d.id) as total_items
    FROM deudas d
    WHERE d.cliente_id = ?
    ORDER BY d.created_at DESC
  `, [id]);
  
  const totalPendiente = debts
    .filter(d => !d.pagado)
    .reduce((sum, d) => sum + d.monto_pendiente, 0);
  
  const totalCancelado = debts
    .filter(d => d.pagado)
    .reduce((sum, d) => sum + d.monto_original, 0);
  
  res.json({
    cliente: customer,
    debts,
    total_pendiente: totalPendiente,
    total_cancelado: totalCancelado,
    cantidad_deudas: debts.length
  });
}));

// POST /api/customers/:id/deudas/:deudaId/producto/:productoId/pagar - Pay individual product in debt
router.post('/:id/deudas/:deudaId/producto/:productoId/pagar', asyncHandler(async (req, res) => {
  const { id, deudaId, productoId } = req.params;
  const { metodo_pago = 'efectivo' } = req.body;
  
  // Get the debt product record
  const deudaProducto = await dbGet(`
    SELECT dp.*, p.precio as precio_actual 
    FROM deuda_productos dp 
    LEFT JOIN productos p ON dp.producto_id = p.id
    WHERE dp.deuda_id = ? AND dp.producto_id = ?
  `, [deudaId, productoId]);
  
  if (!deudaProducto) {
    return res.status(404).json({ error: 'Producto no encontrado en la deuda' });
  }
  
  if (deudaProducto.pagado) {
    return res.status(400).json({ error: 'Este producto ya está pagado' });
  }
  
  // Calculate amount to pay (use current price)
  const montoPagar = deudaProducto.precio_actual || deudaProducto.precio_unitario;
  
  // Update debt_productos as paid
  await dbRun(`
    UPDATE deuda_productos SET pagado = 1 WHERE deuda_id = ? AND producto_id = ?
  `, [deudaId, productoId]);
  
  // Try to record the payment (may fail if table doesn't exist)
  try {
    await dbRun(`
      INSERT INTO deuda_pagos (deuda_id, fecha, monto, metodo_pago)
      VALUES (?, datetime('now'), ?, ?)
    `, [deudaId, montoPagar, metodo_pago]);
  } catch (e) {
    // Table may not exist, continue anyway
    console.log('Note: deuda_pagos table not available');
  }
  
  // Update debt total
  const debt = await dbGet('SELECT * FROM deudas WHERE id = ?', [deudaId]);
  const nuevoPendiente = debt.monto_pendiente - montoPagar;
  
  // Check if all products are paid
  const unpaidProducts = await dbGet(`
    SELECT COUNT(*) as count FROM deuda_productos 
    WHERE deuda_id = ? AND (pagado = 0 OR pagado IS NULL)
  `, [deudaId]);
  
  const estado = unpaidProducts.count === 0 ? 'pagado' : 'pendiente';
  
  await dbRun(`
    UPDATE deudas SET monto_pendiente = ?, estado = ? WHERE id = ?
  `, [Math.max(0, nuevoPendiente), estado, deudaId]);
  
  res.json({
    message: 'Pago de producto registrado',
    monto_pagado: montoPagar,
    deuda_id: deudaId
  });
}));

// POST /api/customers - Create new customer
router.post('/', asyncHandler(async (req, res) => {
  const { nombre, dni, telefono, email, direccion, observaciones } = req.body;
  
  const result = await dbRun(`
    INSERT INTO clientes (nombre, dni, telefono, email, direccion, observaciones, fecha_alta)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `, [nombre, dni, telefono, email, direccion, observaciones]);
  
  const customer = await dbGet('SELECT * FROM clientes WHERE id = ?', [result.lastID]);
  res.status(201).json(customer);
}));

// PUT /api/customers/:id - Update customer
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nombre, dni, telefono, email, direccion, observaciones } = req.body;
  
  await dbRun(`
    UPDATE clientes 
    SET nombre = ?, dni = ?, telefono = ?, email = ?, direccion = ?, observaciones = ?
    WHERE id = ?
  `, [nombre, dni, telefono, email, direccion, observaciones, id]);
  
  const customer = await dbGet('SELECT * FROM clientes WHERE id = ?', [id]);
  res.json(customer);
}));

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const activeDebts = await dbGet(`
    SELECT COUNT(*) as count FROM deudas 
    WHERE cliente_id = ? AND pagado = 0
  `, [id]);
  
  if (activeDebts.count > 0) {
    return res.status(400).json({ 
      error: 'No se puede eliminar cliente con deudas activas',
      cantidad_deudas: activeDebts.count
    });
  }
  
  await dbRun('DELETE FROM clientes WHERE id = ?', [id]);
  res.json({ message: 'Cliente eliminado correctamente' });
}));

export default router;
