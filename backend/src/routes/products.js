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
  res.json(products);
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

// DELETE /api/products/:id - Delete product
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await dbRun('DELETE FROM productos WHERE id = ?', [id]);
  res.json({ message: 'Producto eliminado' });
}));

// DELETE /api/products/by-code/:codigo - Delete product by code
router.delete('/by-code/:codigo', asyncHandler(async (req, res) => {
  const { codigo } = req.params;
  await dbRun('DELETE FROM productos WHERE codigo = ?', [codigo]);
  res.json({ message: 'Producto eliminado por código' });
}));

// POST /api/products/bulk-delete - Delete multiple products by code
router.post('/bulk-delete', asyncHandler(async (req, res) => {
  const { codigos } = req.body;
  if (!Array.isArray(codigos) || codigos.length === 0) {
    return res.status(400).json({ error: 'Se requiere un array de códigos' });
  }
  const placeholders = codigos.map(() => '?').join(',');
  await dbRun(`DELETE FROM productos WHERE codigo IN (${placeholders})`, codigos);
  res.json({ message: `${codigos.length} productos eliminados` });
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
