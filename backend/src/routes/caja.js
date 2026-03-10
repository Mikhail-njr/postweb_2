/**
 * Caja (Cash Register) Routes
 */

import express from 'express';
import { dbGet, dbAll, dbRun } from '../config/database.js';

const router = express.Router();

// Helper for async route handlers
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Initialize caja tables if they don't exist
const initCajaTables = async () => {
  try {
    await dbRun(`
      CREATE TABLE IF NOT EXISTS cierres (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha_cierre DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_ventas INTEGER DEFAULT 0,
        total_efectivo REAL DEFAULT 0,
        total_tarjeta REAL DEFAULT 0,
        total_transferencia REAL DEFAULT 0,
        cobros_deudas REAL DEFAULT 0,
        observaciones TEXT,
        usuario_id INTEGER
      )
    `);
  } catch (e) {
    console.log('Cierres table already exists or error:', e.message);
  }
};

// Initialize on module load
initCajaTables();

// GET /api/caja/stats - Get daily statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  const salesResult = await dbGet(`
    SELECT 
      COUNT(*) as total_ventas,
      COALESCE(SUM(total), 0) as total_ventas_monto,
      COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) as efectivo,
      COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END), 0) as tarjeta,
      COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) as transferencia
    FROM ventas 
    WHERE date(created_at) = ?
  `, [today]);
  
  // Get debt payments - handle missing table
  let debtPayments = 0;
  try {
    const debtResult = await dbGet(`
      SELECT COALESCE(SUM(monto), 0) as total_pagado
      FROM deuda_pagos
      WHERE date(fecha) = ?
    `, [today]);
    debtPayments = debtResult?.total_pagado || 0;
  } catch (e) {
    // Table might not exist
    debtPayments = 0;
  }
  
  // Get active debts
  let activeDebts = { count: 0, total: 0 };
  try {
    const debtsResult = await dbGet(`
      SELECT COUNT(*) as count, COALESCE(SUM(monto_pendiente), 0) as total
      FROM deudas WHERE pagado = 0
    `);
    activeDebts = { count: debtsResult?.count || 0, total: debtsResult?.total || 0 };
  } catch (e) {
    // Table might not exist
  }
  
  const products = await dbGet(`
    SELECT COUNT(*) as count, COALESCE(SUM(stock), 0) as total_stock
    FROM productos WHERE activo = 1
  `);
  
  const customers = await dbGet(`
    SELECT COUNT(*) as count FROM clientes
  `);
  
  res.json({
    fecha: today,
    ventas: {
      cantidad: salesResult.total_ventas,
      total: salesResult.total_ventas_monto,
      efectivo: salesResult.efectivo,
      tarjeta: salesResult.tarjeta,
      transferencia: salesResult.transferencia
    },
    cobros_deudas: debtPayments,
    cuentas_corrientes: {
      activas: activeDebts.count,
      total_pendiente: activeDebts.total
    },
    inventario: {
      productos: products.count,
      stock_total: products.total_stock
    },
    clientes: customers.count
  });
}));

// GET /api/caja/metrics - Get detailed sales metrics
router.get('/metrics', asyncHandler(async (req, res) => {
  const { periodo = 'dia' } = req.query; // dia, semana, mes
  const today = new Date().toISOString().split('T')[0];
  
  let dateFilter;
  if (periodo === 'semana') {
    dateFilter = "date(created_at) >= date('now', '-7 days')";
  } else if (periodo === 'mes') {
    dateFilter = "date(created_at) >= date('now', '-30 days')";
  } else {
    dateFilter = "date(created_at) = ?";
  }
  
  // Basic metrics
  const basicMetrics = await dbGet(`
    SELECT 
      COUNT(*) as total_ventas,
      COALESCE(SUM(total), 0) as total_monto,
      COALESCE(AVG(total), 0) as ticket_promedio,
      COALESCE(MIN(total), 0) as venta_minima,
      COALESCE(MAX(total), 0) as venta_maxima
    FROM ventas 
    WHERE ${dateFilter}
  `, periodo === 'dia' ? [today] : []);
  
  // Sales by payment method
  const byPaymentMethod = await dbGet(`
    SELECT 
      COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) as efectivo,
      COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END), 0) as tarjeta,
      COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) as transferencia
    FROM ventas 
    WHERE ${dateFilter}
  `, periodo === 'dia' ? [today] : []);
  
  // Top selling products
  const topProducts = await dbAll(`
    SELECT 
      p.id,
      p.nombre,
      p.codigo,
      SUM(vi.cantidad) as cantidad_vendida,
      SUM(vi.subtotal) as total_vendido
    FROM venta_items vi
    JOIN ventas v ON vi.venta_id = v.id
    JOIN productos p ON vi.producto_id = p.id
    WHERE ${dateFilter}
    GROUP BY p.id
    ORDER BY cantidad_vendida DESC
    LIMIT 10
  `, periodo === 'dia' ? [today] : []);
  
  // Sales by hour (for today)
  const salesByHour = await dbAll(`
    SELECT 
      strftime('%H', created_at) as hora,
      COUNT(*) as cantidad,
      SUM(total) as monto
    FROM ventas
    WHERE date(created_at) = ?
    GROUP BY hora
    ORDER BY hora
  `, [today]);
  
  // Sales by day (last 7 days)
  const salesByDay = await dbAll(`
    SELECT 
      date(created_at) as fecha,
      COUNT(*) as cantidad,
      SUM(total) as monto
    FROM ventas
    WHERE date(created_at) >= date('now', '-7 days')
    GROUP BY fecha
    ORDER BY fecha
  `);
  
  // Comparison with previous period
  let comparison = { tendencia: 0, diferencia: 0 };
  if (periodo === 'dia') {
    const yesterday = await dbGet(`
      SELECT COALESCE(SUM(total), 0) as total FROM ventas 
      WHERE date(created_at) = date('now', '-1 day')
    `);
    const prevDay = await dbGet(`
      SELECT COALESCE(SUM(total), 0) as total FROM ventas 
      WHERE date(created_at) = date('now', '-2 days')
    `);
    if (yesterday.total > 0) {
      comparison = {
        tendencia: ((basicMetrics.total_monto - yesterday.total) / yesterday.total * 100).toFixed(1),
        diferencia: (basicMetrics.total_monto - yesterday.total).toFixed(2),
        vsAyer: yesterday.total
      };
    }
  }
  
  res.json({
    periodo,
    basic: {
      ventas: basicMetrics.total_ventas,
      monto: basicMetrics.total_monto,
      ticket_promedio: basicMetrics.ticket_promedio.toFixed(2),
      venta_minima: basicMetrics.venta_minima,
      venta_maxima: basicMetrics.venta_maxima
    },
    por_metodo_pago: {
      efectivo: byPaymentMethod.efectivo,
      tarjeta: byPaymentMethod.tarjeta,
      transferencia: byPaymentMethod.transferencia
    },
    top_productos: topProducts,
    ventas_por_hora: salesByHour,
    ventas_por_dia: salesByDay,
    comparacion: comparison
  });
}));

// GET /api/caja/cierres - Get closure history
router.get('/cierres', asyncHandler(async (req, res) => {
  const { limit = 50 } = req.query;
  
  try {
    const cierres = await dbAll(`
      SELECT 
        id,
        fecha_cierre as fecha_apertura,
        fecha_cierre,
        total_ventas,
        COALESCE(total_efectivo, 0) as monto_apertura,
        COALESCE(total_efectivo, 0) + COALESCE(total_tarjeta, 0) + COALESCE(total_transferencia, 0) as monto_cierre,
        total_efectivo,
        total_tarjeta,
        total_transferencia,
        cobros_deudas,
        observaciones,
        usuario_id
      FROM cierres
      ORDER BY fecha_cierre DESC
      LIMIT ?
    `, [parseInt(limit)]);
    
    res.json(cierres);
  } catch (e) {
    // Table might not exist or have issues
    res.json([]);
  }
}));

// POST /api/caja/cierre - Create closure
router.post('/cierre', asyncHandler(async (req, res) => {
  const { total_efectivo, total_tarjeta, total_transferencia, observaciones } = req.body;
  
  const today = new Date().toISOString().split('T')[0];
  
  const salesResult = await dbGet(`
    SELECT 
      COUNT(*) as total_ventas,
      COALESCE(SUM(total), 0) as total
    FROM ventas 
    WHERE date(created_at) = ?
  `, [today]);
  
  let debtPayments = { total: 0 };
  try {
    debtPayments = await dbGet(`
      SELECT COALESCE(SUM(monto), 0) as total
      FROM deuda_pagos
      WHERE date(fecha) = ?
    `, [today]);
  } catch (e) {
    // Table might not exist or have issues
    debtPayments = { total: 0 };
  }
  
  const result = await dbRun(`
    INSERT INTO cierres (fecha_cierre, total_ventas, total_efectivo, total_tarjeta, total_transferencia, cobros_deudas, observaciones)
    VALUES (datetime('now'), ?, ?, ?, ?, ?, ?)
  `, [
    salesResult.total_ventas,
    total_efectivo || 0,
    total_tarjeta || 0,
    total_transferencia || 0,
    debtPayments.total,
    observaciones || null
  ]);
  
  res.status(201).json({
    id: result.lastID,
    message: 'Cierre de caja realizado'
  });
}));

export default router;
