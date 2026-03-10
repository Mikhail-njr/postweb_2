/**
 * Routes Index - Central route registration
 */

import express from 'express';
const router = express.Router();

// Domain routes (ACTIVE APIs only)
import products from './products.js';
import customers from './customers.js';
import sales from './sales.js';
import debts from './debts.js';
import caja from './caja.js';
import lotes from './lotes.js';
import suppliers from './suppliers.js';
import promotions from './promotions.js';
import auth from './auth.js';

// Register routes
router.use('/products', products);
router.use('/customers', customers);
router.use('/ventas', sales);      // Alias: /ventas for sales
router.use('/clientes', customers); // Alias: /clientes for customers  
router.use('/deudas', debts);
router.use('/caja', caja);
router.use('/lotes', lotes);
router.use('/suppliers', suppliers);
router.use('/proveedores', suppliers); // Alias: /proveedores for suppliers
router.use('/promotions', promotions);
router.use('/auth', auth);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
