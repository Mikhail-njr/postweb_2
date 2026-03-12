/**
 * Promotions Routes - API endpoints for promotions management
 * Supports 'combo' and 'individual' promotion types
 */

import express from 'express';
import { dbGet, dbAll, dbRun } from '../config/database.js';

const router = express.Router();

// Helper for async route handlers
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/promotions - Get all promotions
router.get('/', asyncHandler(async (req, res) => {
  const { activa, tipo } = req.query;
  
  let query = 'SELECT * FROM promociones';
  const params = [];
  const conditions = [];
  
  if (activa !== undefined) {
    conditions.push('activa = ?');
    params.push(activa === 'true' ? 1 : 0);
  }
  
  if (tipo !== undefined) {
    conditions.push('tipo = ?');
    params.push(tipo);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY fecha_inicio DESC';
  
  const promotions = await dbAll(query, params);
  
  // Get products for each promotion
  for (const promo of promotions) {
    const products = await dbAll(`
      SELECT p.*, pp.cantidad as cantidad_promocion
      FROM productos p
      JOIN promociones_productos pp ON p.id = pp.producto_id
      WHERE pp.promocion_id = ?
    `, [promo.id]);
    
    promo.productos = products;
    promo.producto_ids = products.map(p => p.id);
  }
  
  res.json(promotions);
}));

// GET /api/promotions/active - Get all active promotions (for use in sales)
router.get('/active', asyncHandler(async (req, res) => {
  const now = new Date().toISOString();
  
  // Get active promotions that are within date range
  const promotions = await dbAll(`
    SELECT * FROM promociones 
    WHERE activa = 1 
    AND (fecha_inicio IS NULL OR fecha_inicio <= ?)
    AND (fecha_fin IS NULL OR fecha_fin >= ?)
    ORDER BY descuento DESC
  `, [now, now]);
  
  // Get products for each promotion
  for (const promo of promotions) {
    const products = await dbAll(`
      SELECT p.id, p.codigo, p.nombre, p.precio, pp.cantidad as cantidad_promocion
      FROM productos p
      JOIN promociones_productos pp ON p.id = pp.producto_id
      WHERE pp.promocion_id = ?
    `, [promo.id]);
    
    promo.productos = products;
    promo.producto_ids = products.map(p => p.id);
  }
  
  res.json(promotions);
}));

// GET /api/promotions/product/:productId - Get active promotions for a specific product
router.get('/product/:productId', asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const now = new Date().toISOString();
  
  // Get active individual promotions for this product
  const promotions = await dbAll(`
    SELECT p.*, pp.cantidad as cantidad_promocion
    FROM promociones p
    JOIN promociones_productos pp ON p.id = pp.promocion_id
    WHERE pp.producto_id = ?
    AND p.activa = 1
    AND (p.fecha_inicio IS NULL OR p.fecha_inicio <= ?)
    AND (p.fecha_fin IS NULL OR p.fecha_fin >= ?)
    ORDER BY p.descuento DESC
  `, [productId, now, now]);
  
  // Calculate discounted prices
  for (const promo of promotions) {
    const product = await dbGet('SELECT precio FROM productos WHERE id = ?', [productId]);
    if (product) {
      promo.precio_original = product.precio;
      promo.precio_con_descuento = product.precio - (product.precio * promo.descuento / 100);
    }
  }
  
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
    SELECT p.*, pp.cantidad as cantidad_promocion
    FROM productos p
    JOIN promociones_productos pp ON p.id = pp.producto_id
    WHERE pp.promocion_id = ?
  `, [id]);
  
  res.json({ ...promotion, productos: products });
}));

// POST /api/promotions - Create new promotion
router.post('/', asyncHandler(async (req, res) => {
  const { nombre, descripcion, descuento, fecha_inicio, fecha_fin, activa, tipo, productos } = req.body;
  
  // Validate required fields
  if (!nombre || descuento === undefined) {
    return res.status(400).json({ error: 'Nombre y descuento son requeridos' });
  }
  
  if (!tipo) {
    tipo = 'individual';
  }
  
  // For combos, require productos
  if (tipo === 'combo' && (!productos || productos.length === 0)) {
    return res.status(400).json({ error: 'Los combos requieren al menos 2 productos' });
  }
  
  const result = await dbRun(`
    INSERT INTO promociones (nombre, descripcion, descuento, fecha_inicio, fecha_fin, activa, tipo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [nombre, descripcion || null, descuento, fecha_inicio || null, fecha_fin || null, activa ? 1 : 0, tipo]);
  
  const promotionId = result.lastID;
  
  // Add products to promotion
  if (productos && productos.length > 0) {
    for (const prod of productos) {
      const productoId = prod.id || prod.producto_id;
      const cantidad = prod.cantidad || prod.cantidad_promocion || 1;
      
      await dbRun(`
        INSERT INTO promociones_productos (promocion_id, producto_id, cantidad)
        VALUES (?, ?, ?)
      `, [promotionId, productoId, cantidad]);
    }
  }
  
  const promotion = await dbGet('SELECT * FROM promociones WHERE id = ?', [promotionId]);
  
  // Get products if it's a combo
  if (tipo === 'combo') {
    const prods = await dbAll(`
      SELECT p.*, pp.cantidad as cantidad_promocion
      FROM productos p
      JOIN promociones_productos pp ON p.id = pp.producto_id
      WHERE pp.promocion_id = ?
    `, [promotionId]);
    promotion.productos = prods;
  }
  
  res.status(201).json(promotion);
}));

// PUT /api/promotions/:id - Update promotion
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, descuento, fecha_inicio, fecha_fin, activa, tipo, productos } = req.body;
  
  await dbRun(`
    UPDATE promociones SET nombre = ?, descripcion = ?, descuento = ?, fecha_inicio = ?, fecha_fin = ?, activa = ?, tipo = ?
    WHERE id = ?
  `, [nombre, descripcion || null, descuento, fecha_inicio || null, fecha_fin || null, activa ? 1 : 0, tipo || 'individual', id]);
  
  // Update products if provided
  if (productos !== undefined) {
    // Remove existing products
    await dbRun('DELETE FROM promociones_productos WHERE promocion_id = ?', [id]);
    
    // Add new products
    if (productos && productos.length > 0) {
      for (const prod of productos) {
        const productoId = prod.id || prod.producto_id;
        const cantidad = prod.cantidad || prod.cantidad_promocion || 1;
        
        await dbRun(`
          INSERT INTO promociones_productos (promocion_id, producto_id, cantidad)
          VALUES (?, ?, ?)
        `, [id, productoId, cantidad]);
      }
    }
  }
  
  const promotion = await dbGet('SELECT * FROM promociones WHERE id = ?', [id]);
  
  // Get products
  const prods = await dbAll(`
    SELECT p.*, pp.cantidad as cantidad_promocion
    FROM productos p
    JOIN promociones_productos pp ON p.id = pp.producto_id
    WHERE pp.promocion_id = ?
  `, [id]);
  promotion.productos = prods;
  
  res.json(promotion);
}));

// DELETE /api/promotions/:id - Delete promotion
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Delete products first
  await dbRun('DELETE FROM promociones_productos WHERE promocion_id = ?', [id]);
  await dbRun('DELETE FROM promociones WHERE id = ?', [id]);
  
  res.json({ message: 'Promoción eliminada' });
}));

// POST /api/promotions/:id/productos - Add product to promotion
router.post('/:id/productos', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { producto_id, cantidad } = req.body;
  
  if (!producto_id) {
    return res.status(400).json({ error: 'producto_id es requerido' });
  }
  
  // Check if promotion exists
  const promotion = await dbGet('SELECT * FROM promociones WHERE id = ?', [id]);
  if (!promotion) {
    return res.status(404).json({ error: 'Promoción no encontrada' });
  }
  
  // Check if product exists
  const product = await dbGet('SELECT * FROM productos WHERE id = ?', [producto_id]);
  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  
  // Add product to promotion
  await dbRun(`
    INSERT INTO promociones_productos (promocion_id, producto_id, cantidad)
    VALUES (?, ?, ?)
  `, [id, producto_id, cantidad || 1]);
  
  res.json({ message: 'Producto agregado a la promoción' });
}));

// DELETE /api/promotions/:id/productos/:productoId - Remove product from promotion
router.delete('/:id/productos/:productoId', asyncHandler(async (req, res) => {
  const { id, productoId } = req.params;
  
  await dbRun(`
    DELETE FROM promociones_productos WHERE promocion_id = ? AND producto_id = ?
  `, [id, productoId]);
  
  res.json({ message: 'Producto eliminado de la promoción' });
}));

export default router;
