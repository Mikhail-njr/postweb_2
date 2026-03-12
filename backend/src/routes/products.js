/**
 * Products Routes - API endpoints for product management
 */

import express from 'express';
import { dbGet, dbAll, dbRun } from '../config/database.js';

const router = express.Router();

// Helper for async route handlers
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Generate product code based on product name
 * Format: First letter + '-' + sequential number (e.g., O-001, V-002)
 * @param {string} nombre - Product name
 * @returns {Promise<string>} Generated product code
 */
async function generateProductCode(nombre) {
  if (!nombre || nombre.trim() === '') {
    return 'X-001'; // Default code if no name
  }
  
  // Get first letter of product name (uppercase)
  const firstLetter = nombre.trim().charAt(0).toUpperCase();
  
  // Find all products with this prefix
  const prefix = `${firstLetter}-`;
  const existingProducts = await dbAll(
    "SELECT codigo FROM productos WHERE codigo LIKE ? ORDER BY codigo DESC",
    [`${prefix}%`]
  );
  
  let nextNumber = 1;
  
  if (existingProducts.length > 0) {
    // Extract numbers from existing codes and find the highest
    const numbers = existingProducts
      .map(p => {
        const match = p.codigo.match(/-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n) && n > 0);
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1;
    }
  }
  
  // Format: LETTER-XXX (e.g., O-001, V-002, VERD-1002)
  // Using 3 digits for numbers < 1000, otherwise 4 digits
  const paddedNumber = nextNumber.toString().padStart(3, '0');
  return `${firstLetter}-${paddedNumber}`;
}

// GET /api/products - Get all products
router.get('/', asyncHandler(async (req, res) => {
  const products = await dbAll(`
    SELECT p.*,
      COALESCE(SUM(CASE WHEN l.estado = 'activo' AND DATE(l.fecha_vencimiento) >= DATE('now', '-3 hours') THEN l.cantidad_actual ELSE 0 END), 0) as stock_calculado,
      COUNT(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN 1 END) as cantidad_lotes,
      MIN(CASE WHEN l.estado = 'activo' AND DATE(l.fecha_vencimiento) >= DATE('now', '-3 hours') THEN l.fecha_vencimiento END) as proximo_vencimiento
    FROM productos p
    LEFT JOIN lotes l ON p.id = l.producto_id
    GROUP BY p.id
    ORDER BY p.id DESC
  `);
  
  // Get active promotions
  const now = new Date().toISOString();
  const activePromotions = await dbAll(`
    SELECT pp.producto_id, pr.id as promocion_id, pr.nombre as promocion_nombre, pr.descuento as promocion_descuento
    FROM promociones pr
    JOIN promociones_productos pp ON pr.id = pp.promocion_id
    WHERE pr.activa = 1 
    AND (pr.fecha_inicio IS NULL OR pr.fecha_inicio <= ?)
    AND (pr.fecha_fin IS NULL OR pr.fecha_fin >= ?)
  `, [now, now]);
  
  // Map promotions to products
  const promoMap = {};
  for (const promo of activePromotions) {
    if (!promoMap[promo.producto_id]) {
      promoMap[promo.producto_id] = [];
    }
    promoMap[promo.producto_id].push({
      id: promo.promocion_id,
      nombre: promo.promocion_nombre,
      descuento: promo.promocion_descuento
    });
  }
  
  // Attach promotions to products
  const productsWithPromos = products.map(product => ({
    ...product,
    promociones: promoMap[product.id] || []
  }));
  
  res.json(productsWithPromos);
}));

// GET /api/products/search - Search products
router.get('/search', asyncHandler(async (req, res) => {
  const { q } = req.query;
  const products = await dbAll(
    `SELECT p.*,
      COALESCE(SUM(CASE WHEN l.estado = 'activo' AND DATE(l.fecha_vencimiento) >= DATE('now', '-3 hours') THEN l.cantidad_actual ELSE 0 END), 0) as stock_calculado,
      COUNT(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN 1 END) as cantidad_lotes,
      MIN(CASE WHEN l.estado = 'activo' AND DATE(l.fecha_vencimiento) >= DATE('now', '-3 hours') THEN l.fecha_vencimiento END) as proximo_vencimiento
    FROM productos p
    LEFT JOIN lotes l ON p.id = l.producto_id
    WHERE p.nombre LIKE ? OR p.codigo LIKE ?
    GROUP BY p.id
    ORDER BY p.nombre`,
    [`%${q}%`, `%${q}%`]
  );
  res.json(products);
}));

// GET /api/products/search-by-barcode/:barcode - Search product by barcode
router.get('/search-by-barcode/:barcode', asyncHandler(async (req, res) => {
  const { barcode } = req.params;
  
  if (!barcode) {
    return res.status(400).json({ error: 'Código de barras requerido' });
  }
  
  const product = await dbGet(
    `SELECT p.*,
      COALESCE(SUM(CASE WHEN l.estado = 'activo' AND DATE(l.fecha_vencimiento) >= DATE('now', '-3 hours') THEN l.cantidad_actual ELSE 0 END), 0) as stock_calculado,
      COUNT(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN 1 END) as cantidad_lotes,
      MIN(CASE WHEN l.estado = 'activo' AND DATE(l.fecha_vencimiento) >= DATE('now', '-3 hours') THEN l.fecha_vencimiento END) as proximo_vencimiento
    FROM productos p
    LEFT JOIN lotes l ON p.id = l.producto_id
    WHERE p.codigo_barras = ?
    GROUP BY p.id
    LIMIT 1`,
    [barcode]
  );
  
  if (!product) {
    return res.status(404).json({ 
      error: 'Producto no encontrado',
      barcode: barcode,
      found: false
    });
  }
  
  res.json({ ...product, found: true, barcode });
}));

// GET /api/products/:id - Get product by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await dbGet(`
    SELECT p.*,
      COALESCE(SUM(CASE WHEN l.estado = 'activo' AND DATE(l.fecha_vencimiento) >= DATE('now', '-3 hours') THEN l.cantidad_actual ELSE 0 END), 0) as stock_calculado,
      COUNT(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN 1 END) as cantidad_lotes,
      MIN(CASE WHEN l.estado = 'activo' AND DATE(l.fecha_vencimiento) >= DATE('now', '-3 hours') THEN l.fecha_vencimiento END) as proximo_vencimiento
    FROM productos p
    LEFT JOIN lotes l ON p.id = l.producto_id
    WHERE p.id = ?
    GROUP BY p.id
  `, [id]);
  
  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  
  res.json(product);
}));

// GET /api/products/:id/lotes - Get product lots
router.get('/:id/lotes', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lotes = await dbAll(
    'SELECT * FROM lotes WHERE producto_id = ? ORDER BY fecha_vencimiento',
    [id]
  );
  res.json(lotes);
}));

// POST /api/products - Create new product
router.post('/', asyncHandler(async (req, res) => {
  let { codigo, nombre, descripcion, precio, stock, categoria, codigo_barras } = req.body;
  
  // Auto-generate code if not provided or empty
  if (!codigo || codigo.trim() === '') {
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ error: 'Se requiere nombre o código del producto' });
    }
    codigo = await generateProductCode(nombre);
  }
  
  const result = await dbRun(
    `INSERT INTO productos (codigo, nombre, descripcion, precio, stock, categoria, codigo_barras) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [codigo, nombre, descripcion, precio, stock, categoria, codigo_barras]
  );
  
  const product = await dbGet('SELECT * FROM productos WHERE id = ?', [result.lastID]);
  res.status(201).json(product);
}));

// PUT /api/products/:id - Update product
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { codigo, nombre, descripcion, precio, stock, categoria, codigo_barras } = req.body;
  
  await dbRun(
    `UPDATE productos SET codigo = ?, nombre = ?, descripcion = ?, precio = ?, stock = ?, categoria = ?, codigo_barras = ?
     WHERE id = ?`,
    [codigo, nombre, descripcion, precio, stock, categoria, codigo_barras, id]
  );
  
  const product = await dbGet('SELECT * FROM productos WHERE id = ?', [id]);
  res.json(product);
}));

// DELETE /api/products/:id - Delete product (with validations, orphaned info, and force option)
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { force } = req.query;
  const forceDelete = force === 'true';
  
  // Helper function to get all orphaned records for a product
  async function getOrphanedRecords(productId) {
    const orphaned = {
      lotes: [],
      ventas: [],
      cuentas_corrientes: [],
      promociones: []
    };
    
    // Get all lots (regardless of state)
    orphaned.lotes = await dbAll(`
      SELECT id, numero_lote, cantidad_actual, estado, fecha_vencimiento
      FROM lotes WHERE producto_id = ?
    `, [productId]);
    
    // Get sales items
    orphaned.ventas = await dbAll(`
      SELECT vi.id, vi.venta_id, vi.cantidad, v.fecha, v.estado as venta_estado
      FROM venta_items vi
      JOIN ventas v ON vi.venta_id = v.id
      WHERE vi.producto_id = ?
    `, [productId]);
    
    // Get cuenta corriente records (all, not just unpaid)
    orphaned.cuentas_corrientes = await dbAll(`
      SELECT dp.id, dp.deuda_id, dp.cantidad, dp.pagado, d.fecha, d.estado as deuda_estado
      FROM deuda_productos dp
      JOIN deudas d ON dp.deuda_id = d.id
      WHERE dp.producto_id = ?
    `, [productId]);
    
    // Get promotions
    orphaned.promociones = await dbAll(`
      SELECT pp.promocion_id, p.nombre as promocion_nombre, p.estado
      FROM promociones_productos pp
      JOIN promociones p ON pp.promocion_id = p.id
      WHERE pp.producto_id = ?
    `, [productId]);
    
    return orphaned;
  }
  
  // Get orphaned records for response
  const orphaned = await getOrphanedRecords(id);
  const hasOrphanedRecords = 
    orphaned.lotes.length > 0 || 
    orphaned.ventas.length > 0 || 
    orphaned.cuentas_corrientes.length > 0 ||
    orphaned.promociones.length > 0;
  
  // If not force deleting, perform validations
  if (!forceDelete) {
    // Check 1: Verify product is not in any active promotion
    const activePromotions = orphaned.promociones.filter(p => p.estado === 'activa');
    if (activePromotions.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el producto porque está asociado a promociones activas',
        promociones: activePromotions.map(p => p.promocion_nombre),
        orphan_info: orphaned,
        hint: 'Usa ?force=true para eliminar junto con registros relacionados'
      });
    }
    
    // Check 2: Verify product has no active stock (no active lots)
    const activeLots = orphaned.lotes.filter(l => l.estado === 'activo' && new Date(l.fecha_vencimiento) >= new Date());
    if (activeLots.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el producto porque tiene stock vigente en lotes',
        lotes_activos: activeLots,
        orphan_info: orphaned,
        hint: 'Usa ?force=true para eliminar junto con registros relacionados'
      });
    }
    
    // Check 3: Verify product is not owed in any cuenta corriente (unpaid)
    const unpaidDebts = orphaned.cuentas_corrientes.filter(d => d.pagado === 0);
    if (unpaidDebts.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el producto porque está asociado a cuentas corrientes pendientes',
        cuentas_pendientes: unpaidDebts,
        orphan_info: orphaned,
        hint: 'Usa ?force=true para eliminar junto con registros relacionados'
      });
    }
  }
  
  // If force or no validations failed, perform cascade delete
  if (forceDelete || !hasOrphanedRecords) {
    // Delete in correct order (respecting foreign keys)
    if (orphaned.promociones.length > 0) {
      await dbRun('DELETE FROM promociones_productos WHERE producto_id = ?', [id]);
    }
    if (orphaned.lotes.length > 0) {
      await dbRun('DELETE FROM lotes WHERE producto_id = ?', [id]);
    }
    if (orphaned.cuentas_corrientes.length > 0) {
      await dbRun('DELETE FROM deuda_productos WHERE producto_id = ?', [id]);
    }
    if (orphaned.ventas.length > 0) {
      await dbRun('DELETE FROM venta_items WHERE producto_id = ?', [id]);
    }
    
    // Finally delete the product
    await dbRun('DELETE FROM productos WHERE id = ?', [id]);
    
    res.json({ 
      message: 'Producto eliminado correctamente',
      force: true,
      eliminados: {
        producto: true,
        lotes: orphaned.lotes.length,
        ventas: orphaned.ventas.length,
        cuentas_corrientes: orphaned.cuentas_corrientes.length,
        promociones: orphaned.promociones.length
      }
    });
  } else {
    // No force but has orphaned records (non-blocking ones)
    // Still delete the product but inform about orphans
    await dbRun('DELETE FROM productos WHERE id = ?', [id]);
    res.json({ 
      message: 'Producto eliminado (registros relacionados conservados)',
      orphan_info: orphaned
    });
  }
}));

// DELETE /api/products/by-code/:codigo - Delete product by code (with validations, orphaned info, and force option)
router.delete('/by-code/:codigo', asyncHandler(async (req, res) => {
  const { codigo } = req.params;
  const { force } = req.query;
  const forceDelete = force === 'true';
  
  // First get the product
  const product = await dbGet('SELECT id, codigo FROM productos WHERE codigo = ?', [codigo]);
  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  
  const productId = product.id;
  
  // Helper function to get all orphaned records for a product
  async function getOrphanedRecords(pid) {
    const orphaned = {
      lotes: [],
      ventas: [],
      cuentas_corrientes: [],
      promociones: []
    };
    
    orphaned.lotes = await dbAll(`SELECT id, numero_lote, cantidad_actual, estado, fecha_vencimiento FROM lotes WHERE producto_id = ?`, [pid]);
    orphaned.ventas = await dbAll(`SELECT vi.id, vi.venta_id, vi.cantidad, v.fecha, v.estado as venta_estado FROM venta_items vi JOIN ventas v ON vi.venta_id = v.id WHERE vi.producto_id = ?`, [pid]);
    orphaned.cuentas_corrientes = await dbAll(`SELECT dp.id, dp.deuda_id, dp.cantidad, dp.pagado, d.fecha, d.estado as deuda_estado FROM deuda_productos dp JOIN deudas d ON dp.deuda_id = d.id WHERE dp.producto_id = ?`, [pid]);
    orphaned.promociones = await dbAll(`SELECT pp.promocion_id, p.nombre as promocion_nombre, p.estado FROM promociones_productos pp JOIN promociones p ON pp.promocion_id = p.id WHERE pp.producto_id = ?`, [pid]);
    
    return orphaned;
  }
  
  const orphaned = await getOrphanedRecords(productId);
  const hasOrphanedRecords = orphaned.lotes.length > 0 || orphaned.ventas.length > 0 || orphaned.cuentas_corrientes.length > 0 || orphaned.promociones.length > 0;
  
  if (!forceDelete) {
    // Check 1: Active promotions
    const activePromotions = orphaned.promociones.filter(p => p.estado === 'activa');
    if (activePromotions.length > 0) {
      return res.status(400).json({ error: 'No se puede eliminar el producto porque está asociado a promociones activas', promociones: activePromotions.map(p => p.promocion_nombre), orphan_info: orphaned, hint: 'Usa ?force=true para eliminar junto con registros relacionados' });
    }
    
    // Check 2: Active stock
    const activeLots = orphaned.lotes.filter(l => l.estado === 'activo' && new Date(l.fecha_vencimiento) >= new Date());
    if (activeLots.length > 0) {
      return res.status(400).json({ error: 'No se puede eliminar el producto porque tiene stock vigente en lotes', lotes_activos: activeLots, orphan_info: orphaned, hint: 'Usa ?force=true para eliminar junto con registros relacionados' });
    }
    
    // Check 3: Unpaid debts
    const unpaidDebts = orphaned.cuentas_corrientes.filter(d => d.pagado === 0);
    if (unpaidDebts.length > 0) {
      return res.status(400).json({ error: 'No se puede eliminar el producto porque está asociado a cuentas corrientes pendientes', cuentas_pendientes: unpaidDebts, orphan_info: orphaned, hint: 'Usa ?force=true para eliminar junto con registros relacionados' });
    }
  }
  
  // Perform cascade delete if force
  if (forceDelete || !hasOrphanedRecords) {
    if (orphaned.promociones.length > 0) await dbRun('DELETE FROM promociones_productos WHERE producto_id = ?', [productId]);
    if (orphaned.lotes.length > 0) await dbRun('DELETE FROM lotes WHERE producto_id = ?', [productId]);
    if (orphaned.cuentas_corrientes.length > 0) await dbRun('DELETE FROM deuda_productos WHERE producto_id = ?', [productId]);
    if (orphaned.ventas.length > 0) await dbRun('DELETE FROM venta_items WHERE producto_id = ?', [productId]);
    await dbRun('DELETE FROM productos WHERE id = ?', [productId]);
    
    res.json({ message: 'Producto eliminado correctamente', force: true, eliminados: { producto: true, lotes: orphaned.lotes.length, ventas: orphaned.ventas.length, cuentas_corrientes: orphaned.cuentas_corrientes.length, promociones: orphaned.promociones.length } });
  } else {
    await dbRun('DELETE FROM productos WHERE id = ?', [productId]);
    res.json({ message: 'Producto eliminado (registros relacionados conservados)', orphan_info: orphaned });
  }
}));

// POST /api/products/bulk-delete - Delete multiple products by code (with validations, orphaned info, and force option)
router.post('/bulk-delete', asyncHandler(async (req, res) => {
  const { codigos, force } = req.body;
  const forceDelete = force === true;
  
  if (!Array.isArray(codigos) || codigos.length === 0) {
    return res.status(400).json({ error: 'Se requiere un array de códigos' });
  }
  
  const placeholders = codigos.map(() => '?').join(',');
  const products = await dbAll(`SELECT id, codigo FROM productos WHERE codigo IN (${placeholders})`, codigos);
  
  if (products.length === 0) {
    return res.status(404).json({ error: 'No se encontraron productos con los códigos proporcionados' });
  }
  
  const validProducts = [];
  const blockedProducts = [];
  
  for (const product of products) {
    // Get all orphaned records
    const orphaned = {
      lotes: await dbAll('SELECT id FROM lotes WHERE producto_id = ?', [product.id]),
      ventas: await dbAll('SELECT id FROM venta_items WHERE producto_id = ?', [product.id]),
      cuentas_corrientes: await dbAll('SELECT id FROM deuda_productos WHERE producto_id = ?', [product.id]),
      promociones: await dbAll('SELECT pp.promocion_id, p.estado FROM promociones_productos pp JOIN promociones p ON pp.promocion_id = p.id WHERE pp.producto_id = ?', [product.id])
    };
    
    if (!forceDelete) {
      // Check 1: Active promotions
      const activePromotions = orphaned.promociones.filter(p => p.estado === 'activa');
      if (activePromotions.length > 0) {
        blockedProducts.push({ codigo: product.codigo, razon: 'promocion_activa', orphan_info: orphaned });
        continue;
      }
      
      // Check 2: Active stock
      const activeLots = orphaned.lotes.filter(l => l.estado === 'activo');
      if (activeLots.length > 0) {
        blockedProducts.push({ codigo: product.codigo, razon: 'stock_vigente', orphan_info: orphaned });
        continue;
      }
      
      // Check 3: Unpaid debts
      const unpaidDebts = orphaned.cuentas_corrientes.filter(d => d.pagado === 0);
      if (unpaidDebts.length > 0) {
        blockedProducts.push({ codigo: product.codigo, razon: 'cuenta_corriente_pendiente', orphan_info: orphaned });
        continue;
      }
    }
    
    validProducts.push({ codigo: product.codigo, id: product.id, orphaned: orphaned });
  }
  
  // Delete valid products with cascade
  const eliminados = { productos: 0, lotes: 0, ventas: 0, cuentas_corrientes: 0, promociones: 0 };
  
  for (const vp of validProducts) {
    if (forceDelete) {
      if (vp.orphaned.promociones.length > 0) {
        await dbRun('DELETE FROM promociones_productos WHERE producto_id = ?', [vp.id]);
        eliminados.promociones += vp.orphaned.promociones.length;
      }
      if (vp.orphaned.lotes.length > 0) {
        await dbRun('DELETE FROM lotes WHERE producto_id = ?', [vp.id]);
        eliminados.lotes += vp.orphaned.lotes.length;
      }
      if (vp.orphaned.cuentas_corrientes.length > 0) {
        await dbRun('DELETE FROM deuda_productos WHERE producto_id = ?', [vp.id]);
        eliminados.cuentas_corrientes += vp.orphaned.cuentas_corrientes.length;
      }
      if (vp.orphaned.ventas.length > 0) {
        await dbRun('DELETE FROM venta_items WHERE producto_id = ?', [vp.id]);
        eliminados.ventas += vp.orphaned.ventas.length;
      }
    }
    await dbRun('DELETE FROM productos WHERE id = ?', [vp.id]);
    eliminados.productos++;
  }
  
  res.json({ 
    message: `${validProducts.length} productos eliminados`,
    force: forceDelete,
    eliminados: eliminados,
    bloqueados: blockedProducts,
    hint: forceDelete ? 'Eliminación forzada completada' : 'Usa {force: true} para eliminar junto con registros relacionados'
  });
}));

// DELETE /api/products/cleanup - Delete test products (stock = 0 and test códigos)
router.delete('/cleanup', asyncHandler(async (req, res) => {
  const result = await dbRun(`
    DELETE FROM productos 
    WHERE stock = 0 
    AND (
      codigo LIKE 'OTRO-%' OR 
      codigo LIKE 'zxc-%' OR 
      codigo LIKE 'test%' OR 
      codigo LIKE 'TEST%' OR
      codigo LIKE 'BEB-%'
    )
  `);
  res.json({ message: `${result.changes} productos de prueba eliminados` });
}));

export default router;
