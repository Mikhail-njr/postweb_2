/**
 * Seed Script - Add sample products to the database
 * Run this once to populate initial products
 */

import { dbRun, dbAll } from '../config/database.js';

export async function seedProducts() {
  console.log('🔄 Seeding products...');
  
  try {
    // Check if products already exist
    const existingProducts = await dbAll('SELECT COUNT(*) as count FROM productos');
    if (existingProducts[0].count > 0) {
      console.log('⚠️ Products already exist, skipping seed');
      return;
    }
    
    // Sample products
    const products = [
      { codigo: 'PAN-001', nombre: 'Pan Francés', descripcion: 'Pan francés tradicional', precio: 250, stock: 50, categoria: 'Panadería' },
      { codigo: 'PAN-002', nombre: 'Pan Lactal', descripcion: 'Pan lactal americano', precio: 350, stock: 30, categoria: 'Panadería' },
      { codigo: 'PAN-003', nombre: 'Factura', descripcion: 'Factura medialuna', precio: 150, stock: 100, categoria: 'Panadería' },
      { codigo: 'LAC-001', nombre: 'Leche Entera', descripcion: 'Leche entera 1 litro', precio: 280, stock: 40, categoria: 'Lácteos' },
      { codigo: 'LAC-002', nombre: 'Leche Descremada', descripcion: 'Leche descremada 1 litro', precio: 260, stock: 35, categoria: 'Lácteos' },
      { codigo: 'LAC-003', nombre: 'Yogur', descripcion: 'Yogur natural 1kg', precio: 450, stock: 25, categoria: 'Lácteos' },
      { codigo: 'LAC-004', nombre: 'Queso', descripcion: 'Queso fresco 500g', precio: 800, stock: 15, categoria: 'Lácteos' },
      { codigo: 'CAR-001', nombre: 'Carne Molida', descripcion: 'Carne molida común 1kg', precio: 1800, stock: 20, categoria: 'Carnes' },
      { codigo: 'CAR-002', nombre: 'Pollo', descripcion: 'Pechuga de pollo 1kg', precio: 1500, stock: 15, categoria: 'Carnes' },
      { codigo: 'EMB-001', nombre: 'Salchichas', descripcion: 'Salchichas paleta 500g', precio: 600, stock: 30, categoria: 'Embutidos' },
      { codigo: 'EMB-002', nombre: 'Jamón', descripcion: 'Jamón cocido 300g', precio: 750, stock: 20, categoria: 'Embutidos' },
      { codigo: 'BEB-001', nombre: 'Gaseosa', descripcion: 'Gaseosa cola 2 litros', precio: 450, stock: 50, categoria: 'Bebidas' },
      { codigo: 'BEB-002', nombre: 'Agua', descripcion: 'Agua mineral 1.5 litros', precio: 200, stock: 60, categoria: 'Bebidas' },
      { codigo: 'BEB-003', nombre: 'Jugo', descripcion: 'Jugo de naranja 1 litro', precio: 350, stock: 25, categoria: 'Bebidas' },
      { codigo: 'ALD-001', nombre: 'Fideos', descripcion: 'Fideos spaghetti 500g', precio: 180, stock: 40, categoria: 'Almacén' },
      { codigo: 'ALD-002', nombre: 'Arroz', descripcion: 'Arroz blanco 1kg', precio: 250, stock: 35, categoria: 'Almacén' },
      { codigo: 'ALD-003', nombre: 'Aceite', descripcion: 'Aceite de girasol 900ml', precio: 480, stock: 25, categoria: 'Almacén' },
      { codigo: 'ALD-004', nombre: 'Azúcar', descripcion: 'Azúcar blanca 1kg', precio: 200, stock: 30, categoria: 'Almacén' },
      { codigo: 'ALD-005', nombre: 'Sal', descripcion: 'Sal fina 500g', precio: 120, stock: 40, categoria: 'Almacén' },
      { codigo: 'PER-001', nombre: 'Pañales', descripcion: 'Pañales talle M x12', precio: 1200, stock: 15, categoria: 'Perfumería' },
      { codigo: 'PER-002', nombre: 'Jabón', descripcion: 'Jabón de tocador x3', precio: 250, stock: 30, categoria: 'Perfumería' },
      { codigo: 'LIM-001', nombre: 'Lavandina', descripcion: 'Lavandina 1 litro', precio: 180, stock: 35, categoria: 'Limpieza' },
      { codigo: 'LIM-002', nombre: 'Detergente', descripcion: 'Detergente 500ml', precio: 220, stock: 40, categoria: 'Limpieza' },
      { codigo: 'LIM-003', nombre: 'Jill', descripcion: 'Jill Limón 500ml', precio: 280, stock: 25, categoria: 'Limpieza' },
    ];
    
    for (const product of products) {
      await dbRun(
        `INSERT INTO productos (codigo, nombre, descripcion, precio, stock, categoria, activo) 
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [product.codigo, product.nombre, product.descripcion, product.precio, product.stock, product.categoria]
      );
    }
    
    console.log(`✅ Added ${products.length} products`);
    
    // Add sample users
    const users = [
      { username: 'admin', password: 'admin123', nombre: 'Administrador', rol: 'admin' },
      { username: 'cajero', password: 'cajero123', nombre: 'Cajero Principal', rol: 'cajero' },
    ];
    
    for (const user of users) {
      await dbRun(
        `INSERT INTO usuarios (username, password, nombre, rol, activo) VALUES (?, ?, ?, ?, 1)`,
        [user.username, user.password, user.nombre, user.rol]
      );
    }
    
    console.log(`✅ Added ${users.length} users`);
    console.log('✅ Seed completed!');
    console.log('   Default login: admin / admin123');
    
  } catch (error) {
    console.error('❌ Seed error:', error.message);
  }
}
