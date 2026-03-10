/**
 * Sales Routes - API endpoints for sales management
 */

import express from 'express';
import { dbGet, dbAll, dbRun } from '../config/database.js';
import db from '../config/database.js';

const router = express.Router();

// Helper for async route handlers
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/ventas - Get all sales
router.get('/', asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, fecha, inicio, fin } = req.query;
  
  let query = `
    SELECT 
      v.id,
      v.created_at as fecha,
      v.total,
      v.metodo_pago,
      v.cliente_id,
      c.nombre as cliente_nombre,
      (SELECT COUNT(*) FROM venta_items WHERE venta_id = v.id) as items_count
    FROM ventas v
    LEFT JOIN clientes c ON v.cliente_id = c.id
  `;
  
  const params = [];
  
  if (inicio && fin) {
    // Date range filter
    query += ` WHERE date(v.created_at) >= date(?) AND date(v.created_at) <= date(?)`;
    params.push(inicio, fin);
  } else if (fecha) {
    // Single date filter
    query += ` WHERE date(v.created_at) = date(?)`;
    params.push(fecha);
  }
  
  query += ` ORDER BY v.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));
  
  const sales = await dbAll(query, params);
  
  res.json(sales);
}));

// GET /api/ventas/resumen-general - Get general sales summary (must be before /:id)
router.get('/resumen-general', asyncHandler(async (req, res) => {
  const { inicio, fin } = req.query;
  
  let dateFilter = '';
  let params = [];
  
  if (inicio && fin) {
    dateFilter = ' WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)';
    params = [inicio, fin];
  }
  
  // Total sales summary
  const summary = await dbGet(`
    SELECT 
      COUNT(*) as total_ventas,
      COALESCE(SUM(total), 0) as monto_total,
      COALESCE(AVG(total), 0) as promedio_venta,
      COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) as efectivo,
      COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END), 0) as tarjeta,
      COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) as transferencia
    FROM ventas v
    ${dateFilter}
  `, params);
  
  // Sales by day (last 7 days or in range)
  const salesByDay = await dbAll(`
    SELECT 
      date(created_at) as fecha,
      COUNT(*) as cantidad,
      SUM(total) as total
    FROM ventas v
    ${dateFilter ? dateFilter + ' AND' : ' WHERE'} date(created_at) >= datetime('now', '-7 days')
    GROUP BY date(created_at)
    ORDER BY fecha ASC
  `, params);
  
  res.json({
    resumen: {
      total_ventas: summary?.total_ventas || 0,
      monto_total: summary?.monto_total || 0,
      promedio_venta: summary?.promedio_venta || 0,
      efectivo: summary?.efectivo || 0,
      tarjeta: summary?.tarjeta || 0,
      transferencia: summary?.transferencia || 0
    },
    cantidad_productos: 0,
    ventas_por_dia: salesByDay || []
  });
}));

// GET /api/ventas/mas-vendidos - Get most sold products (must be before /:id)
router.get('/mas-vendidos', asyncHandler(async (req, res) => {
  const { limit = 10, inicio, fin } = req.query;
  const topLimit = parseInt(limit) || 10;
  
  let dateFilter = '';
  let params = [];
  
  if (inicio && fin) {
    dateFilter = ' AND date(v.created_at) >= date(?) AND date(v.created_at) <= date(?)';
    params = [inicio, fin];
  } else if (inicio) {
    dateFilter = ' AND date(v.created_at) >= date(?)';
    params = [inicio];
  } else if (fin) {
    dateFilter = ' AND date(v.created_at) <= date(?)';
    params = [fin];
  }
  
  const results = await dbAll(`
    SELECT 
      vi.producto_id,
      p.codigo,
      p.nombre as producto_nombre,
      SUM(vi.cantidad) as cantidad_vendida,
      SUM(vi.subtotal) as total_vendido
    FROM venta_items vi
    JOIN ventas v ON vi.venta_id = v.id
    LEFT JOIN productos p ON vi.producto_id = p.id
    WHERE 1=1 ${dateFilter}
    GROUP BY vi.producto_id
    ORDER BY cantidad_vendida DESC
    LIMIT ?
  `, [...params, topLimit]);
  
  res.json(results);
}));

// GET /api/ventas/menos-vendidos - Get least sold products (must be before /:id)
router.get('/menos-vendidos', asyncHandler(async (req, res) => {
  const { limit = 10, inicio, fin } = req.query;
  const topLimit = parseInt(limit) || 10;
  
  let dateFilter = '';
  let params = [];
  
  if (inicio && fin) {
    dateFilter = ' AND date(v.created_at) >= date(?) AND date(v.created_at) <= date(?)';
    params = [inicio, fin];
  } else if (inicio) {
    dateFilter = ' AND date(v.created_at) >= date(?)';
    params = [inicio];
  } else if (fin) {
    dateFilter = ' AND date(v.created_at) <= date(?)';
    params = [fin];
  }
  
  const results = await dbAll(`
    SELECT 
      vi.producto_id,
      p.codigo,
      p.nombre as producto_nombre,
      SUM(vi.cantidad) as cantidad_vendida,
      SUM(vi.subtotal) as total_vendido
    FROM venta_items vi
    JOIN ventas v ON vi.venta_id = v.id
    LEFT JOIN productos p ON vi.producto_id = p.id
    WHERE 1=1 ${dateFilter}
    GROUP BY vi.producto_id
    ORDER BY cantidad_vendida ASC
    LIMIT ?
  `, [...params, topLimit]);
  
  res.json(results);
}));

// GET /api/ventas/:id - Get sale by ID with products
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const sale = await dbGet(`
    SELECT v.*, c.nombre as cliente_nombre
    FROM ventas v
    LEFT JOIN clientes c ON v.cliente_id = c.id
    WHERE v.id = ?
  `, [id]);
  
  if (!sale) {
    return res.status(404).json({ error: 'Venta no encontrada' });
  }
  
  const products = await dbAll(`
    SELECT vp.*, p.nombre, p.codigo, p.codigo_barras
    FROM venta_items vp
    JOIN productos p ON vp.producto_id = p.id
    WHERE vp.venta_id = ?
  `, [id]);
  
  res.json({ ...sale, productos: products });
}));

// POST /api/ventas - Create new sale
router.post('/', asyncHandler(async (req, res) => {
  const { items, metodo_pago, cliente_id, observaciones } = req.body;
  
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'No hay productos en la venta' });
  }
  
  const total = items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
  
  // Generate invoice number
  const lastSale = await dbGet('SELECT numero_factura FROM ventas ORDER BY id DESC LIMIT 1');
  let newNumero = '0001-00000001';
  if (lastSale && lastSale.numero_factura) {
    const parts = lastSale.numero_factura.split('-');
    if (parts.length === 2) {
      const num = parseInt(parts[1]) + 1;
      newNumero = parts[0] + '-' + num.toString().padStart(8, '0');
    }
  }
  
  const result = await dbRun(`
    INSERT INTO ventas (numero_factura, total, metodo_pago, cliente_id)
    VALUES (?, ?, ?, ?)
  `, [newNumero, total, metodo_pago || 'efectivo', cliente_id || null]);
  
  const ventaId = result.lastID;
  
  for (const item of items) {
    const subtotal = item.cantidad * item.precio_unitario;
    await dbRun(`
      INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, subtotal)
      VALUES (?, ?, ?, ?, ?)
    `, [ventaId, item.producto_id, item.cantidad, item.precio_unitario, subtotal]);
    
    // Update stock using FIFO lot system
    let cantidadRestante = item.cantidad;
    
    // Get active lots for this product (not expired, ordered by fecha_vencimiento - oldest first)
    const lotes = await dbAll(`
      SELECT * FROM lotes 
      WHERE producto_id = ? AND estado = 'activo' AND DATE(fecha_vencimiento) >= DATE('now', '-3 hours')
      ORDER BY fecha_vencimiento ASC, created_at ASC
    `, [item.producto_id]);
    
    for (const lote of lotes) {
      if (cantidadRestante <= 0) break;
      
      const cantidadADescontar = Math.min(cantidadRestante, lote.cantidad_actual);
      
      await dbRun(`
        UPDATE lotes SET cantidad_actual = cantidad_actual - ? WHERE id = ?
      `, [cantidadADescontar, lote.id]);
      
      cantidadRestante -= cantidadADescontar;
    }
    
    // If there's still quantity remaining after using all lots, check if we can use the general stock
    if (cantidadRestante > 0) {
      // Use fallback to product stock if needed (for products without lots)
      const product = await dbGet('SELECT stock FROM productos WHERE id = ?', [item.producto_id]);
      if (product && product.stock >= cantidadRestante) {
        await dbRun('UPDATE productos SET stock = stock - ? WHERE id = ?', [cantidadRestante, item.producto_id]);
      }
    } else {
      // Update product stock from lots (after using FIFO)
      const result = await dbGet(`
        SELECT COALESCE(SUM(
          CASE WHEN estado = 'activo' AND DATE(fecha_vencimiento) >= DATE('now', '-3 hours') 
          THEN cantidad_actual ELSE 0 END
        ), 0) as stock
        FROM lotes WHERE producto_id = ?
      `, [item.producto_id]);
      await dbRun('UPDATE productos SET stock = ? WHERE id = ?', [result.stock, item.producto_id]);
    }
  }
  
  res.status(201).json({ 
    id: ventaId, 
    total, 
    metodo_pago: metodo_pago || 'efectivo',
    items: items.length
  });
}));

// POST /api/ventas/cuenta-corriente - Create sale on account
router.post('/cuenta-corriente', asyncHandler(async (req, res) => {
  const { items, cliente_id, observaciones } = req.body;
  
  if (!cliente_id) {
    return res.status(400).json({ error: 'Cliente requerido para cuenta corriente' });
  }
  
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'No hay productos en la venta' });
  }
  
  const total = items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
  
  const debtResult = await dbRun(`
    INSERT INTO deudas (cliente_id, fecha, monto_original, monto_pendiente, pagado, observaciones)
    VALUES (?, datetime('now'), ?, ?, 0, ?)
  `, [cliente_id, total, total, observaciones || 'Venta a cuenta corriente']);
  
  const deudaId = debtResult.lastID;
  
  for (const item of items) {
    await dbRun(`
      INSERT INTO deuda_productos (deuda_id, producto_id, cantidad, precio_unitario, pagado)
      VALUES (?, ?, ?, ?, 0)
    `, [deudaId, item.producto_id, item.cantidad, item.precio_unitario]);
    
    // Update stock using FIFO lot system (same as regular sale)
    let cantidadRestante = item.cantidad;
    
    const lotes = await dbAll(`
      SELECT * FROM lotes 
      WHERE producto_id = ? AND estado = 'activo' AND DATE(fecha_vencimiento) >= DATE('now', '-3 hours')
      ORDER BY fecha_vencimiento ASC, created_at ASC
    `, [item.producto_id]);
    
    for (const lote of lotes) {
      if (cantidadRestante <= 0) break;
      
      const cantidadADescontar = Math.min(cantidadRestante, lote.cantidad_actual);
      
      await dbRun(`
        UPDATE lotes SET cantidad_actual = cantidad_actual - ? WHERE id = ?
      `, [cantidadADescontar, lote.id]);
      
      cantidadRestante -= cantidadADescontar;
    }
    
    // Update product stock from lots
    if (cantidadRestante <= 0) {
      const result = await dbGet(`
        SELECT COALESCE(SUM(
          CASE WHEN estado = 'activo' AND DATE(fecha_vencimiento) >= DATE('now', '-3 hours') 
          THEN cantidad_actual ELSE 0 END
        ), 0) as stock
        FROM lotes WHERE producto_id = ?
      `, [item.producto_id]);
      await dbRun('UPDATE productos SET stock = ? WHERE id = ?', [result.stock, item.producto_id]);
    }
  }
  
  res.status(201).json({ 
    deuda_id: deudaId,
    total,
    cliente_id,
    message: 'Venta a cuenta corriente creada'
  });
}));

// DELETE /api/ventas/:id - Cancel sale
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const products = await dbAll(`
    SELECT producto_id, cantidad FROM venta_items WHERE venta_id = ?
  `, [id]);
  
  for (const item of products) {
    // Restore stock using LIFO (Last In, First Out) - opposite of sale
    let cantidadRestante = item.cantidad;
    
    // Get active lots for this product ordered by newest first (LIFO)
    const lotes = await dbAll(`
      SELECT * FROM lotes 
      WHERE producto_id = ? AND estado = 'activo'
      ORDER BY fecha_vencimiento DESC, created_at DESC
    `, [item.producto_id]);
    
    // First, try to add to existing active lots
    for (const lote of lotes) {
      if (cantidadRestante <= 0) break;
      
      // Check if lot is not expired
      const isNotExpired = new Date(lote.fecha_vencimiento) >= new Date();
      if (isNotExpired) {
        await dbRun(`
          UPDATE lotes SET cantidad_actual = cantidad_actual + ? WHERE id = ?
        `, [cantidadRestante, lote.id]);
        cantidadRestante = 0;
      }
    }
    
    // If there's still quantity to restore and no valid lots, create a new lot
    if (cantidadRestante > 0) {
      await dbRun(`
        INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual, costo_unitario, estado, fecha_ingreso)
        VALUES (?, ?, datetime('now', '+1 year'), ?, ?, NULL, 'activo', datetime('now'))
      `, [item.producto_id, `CANCEL-${id}-${item.producto_id}`, cantidadRestante, cantidadRestante]);
    }
    
    // Update product stock from lots
    const result = await dbGet(`
      SELECT COALESCE(SUM(
        CASE WHEN estado = 'activo' AND DATE(fecha_vencimiento) >= DATE('now', '-3 hours') 
        THEN cantidad_actual ELSE 0 END
      ), 0) as stock
      FROM lotes WHERE producto_id = ?
    `, [item.producto_id]);
    await dbRun('UPDATE productos SET stock = ? WHERE id = ?', [result.stock, item.producto_id]);
  }
  
  await dbRun('DELETE FROM venta_items WHERE venta_id = ?', [id]);
  await dbRun('DELETE FROM ventas WHERE id = ?', [id]);
  
  res.json({ message: 'Venta cancelada y stock restaurado' });
}));

// GET /api/ventas/resumen/dia - Get daily sales summary
router.get('/resumen/dia', asyncHandler(async (req, res) => {
  const { fecha } = req.query;
  const targetDate = fecha || new Date().toISOString().split('T')[0];
  
  const result = await dbGet(`
    SELECT 
      COUNT(*) as cantidad,
      COALESCE(SUM(total), 0) as total,
      COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) as efectivo,
      COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END), 0) as tarjeta,
      COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) as transferencia
    FROM ventas 
    WHERE date(created_at) = date(?)
  `, [targetDate]);
  
  // Get cuenta corriente (debt payments for the day) - handle missing table
  let cuenta_corriente = 0;
  try {
    const debtPayments = await dbGet(`
      SELECT COALESCE(SUM(monto), 0) as cuenta_corriente
      FROM deuda_pagos
      WHERE date(fecha) = date(?)
    `, [targetDate]);
    cuenta_corriente = debtPayments?.cuenta_corriente || 0;
  } catch (e) {
    // Table might not exist
    cuenta_corriente = 0;
  }
  
  res.json({
    fecha: targetDate,
    cantidad: result.cantidad,
    total: result.total,
    efectivo: result.efectivo,
    tarjeta: result.tarjeta,
    transferencia: result.transferencia,
    cuenta_corriente: cuenta_corriente
  });
}));

// GET /api/ventas/mas-vendidos - Get most sold products
router.get('/mas-vendidos', asyncHandler(async (req, res) => {
  const { limit = 10, inicio, fin } = req.query;
  const topLimit = parseInt(limit) || 10;
  
  let dateFilter = '';
  let params = [];
  
  if (inicio && fin) {
    dateFilter = ' AND date(v.created_at) >= date(?) AND date(v.created_at) <= date(?)';
    params = [inicio, fin];
  } else if (inicio) {
    dateFilter = ' AND date(v.created_at) >= date(?)';
    params = [inicio];
  } else if (fin) {
    dateFilter = ' AND date(v.created_at) <= date(?)';
    params = [fin];
  }
  
  const results = await dbAll(`
    SELECT 
      vi.producto_id,
      p.codigo,
      p.nombre as producto_nombre,
      SUM(vi.cantidad) as cantidad_vendida,
      SUM(vi.subtotal) as total_vendido
    FROM venta_items vi
    JOIN ventas v ON vi.venta_id = v.id
    LEFT JOIN productos p ON vi.producto_id = p.id
    WHERE v.estado != 'cancelada' ${dateFilter}
    GROUP BY vi.producto_id
    ORDER BY cantidad_vendida DESC
    LIMIT ?
  `, [...params, topLimit]);
  
  res.json(results);
}));

// GET /api/ventas/menos-vendidos - Get least sold products
router.get('/menos-vendidos', asyncHandler(async (req, res) => {
  const { limit = 10, inicio, fin } = req.query;
  const topLimit = parseInt(limit) || 10;
  
  let dateFilter = '';
  let params = [];
  
  if (inicio && fin) {
    dateFilter = ' AND date(v.created_at) >= date(?) AND date(v.created_at) <= date(?)';
    params = [inicio, fin];
  } else if (inicio) {
    dateFilter = ' AND date(v.created_at) >= date(?)';
    params = [inicio];
  } else if (fin) {
    dateFilter = ' AND date(v.created_at) <= date(?)';
    params = [fin];
  }
  
  // First get products that have been sold
  const results = await dbAll(`
    SELECT 
      vi.producto_id,
      p.codigo,
      p.nombre as producto_nombre,
      SUM(vi.cantidad) as cantidad_vendida,
      SUM(vi.subtotal) as total_vendido
    FROM venta_items vi
    JOIN ventas v ON vi.venta_id = v.id
    LEFT JOIN productos p ON vi.producto_id = p.id
    WHERE v.estado != 'cancelada' ${dateFilter}
    GROUP BY vi.producto_id
    ORDER BY cantidad_vendida ASC
    LIMIT ?
  `, [...params, topLimit]);
  
  res.json(results);
}));

// GET /api/ventas/resumen-general - Get general sales summary
router.get('/resumen-general', asyncHandler(async (req, res) => {
  const { inicio, fin } = req.query;
  
  let dateFilter = '';
  let params = [];
  
  if (inicio && fin) {
    dateFilter = ' WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)';
    params = [inicio, fin];
  }
  
  // Total sales summary
  const summary = await dbGet(`
    SELECT 
      COUNT(*) as total_ventas,
      COALESCE(SUM(total), 0) as monto_total,
      COALESCE(AVG(total), 0) as promedio_venta,
      COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) as efectivo,
      COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END), 0) as tarjeta,
      COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) as transferencia
    FROM ventas v
    ${dateFilter}
  `, params);
  
  // Total products sold
  const productsSold = await dbGet(`
    SELECT 
      COALESCE(SUM(vi.cantidad), 0) as cantidad_productos
    FROM venta_items vi
    JOIN ventas v ON vi.venta_id = v.id
    ${dateFilter ? ' AND ' + dateFilter.replace('WHERE', '').replace('v.', 'v.') : ''}
    AND v.estado != 'cancelada'
  `, params);
  
  // Sales by day (last 7 days or in range)
  const salesByDay = await dbAll(`
    SELECT 
      date(created_at) as fecha,
      COUNT(*) as cantidad,
      SUM(total) as total
    FROM ventas v
    ${dateFilter ? dateFilter + ' AND' : ' WHERE'} date(created_at) >= date('now', '-7 days')
    GROUP BY date(created_at)
    ORDER BY fecha ASC
  `, params);
  
  res.json({
    resumen: {
      total_ventas: summary.total_ventas || 0,
      monto_total: summary.monto_total || 0,
      promedio_venta: summary.promedio_venta || 0,
      efectivo: summary.efectivo || 0,
      tarjeta: summary.tarjeta || 0,
      transferencia: summary.transferencia || 0
    },
    cantidad_productos: productsSold?.cantidad_productos || 0,
    ventas_por_dia: salesByDay
  });
}));

export default router;
