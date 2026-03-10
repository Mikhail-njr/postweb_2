/**
 * Auth Routes - API endpoints for authentication
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { dbGet, dbAll, dbRun } from '../config/database.js';

const router = express.Router();

// Helper for async route handlers
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// POST /api/auth/login - Login
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  
  const user = await dbGet('SELECT * FROM usuarios WHERE username = ?', [username]);
  
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  
  // Verify password with bcrypt
  const passwordMatch = bcrypt.compareSync(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  
  res.json({
    token: user.id.toString(),
    user: {
      id: user.id,
      username: user.username,
      rol: user.rol,
      nombre: user.nombre
    }
  });
}));

// GET /api/auth/verify - Verify token
router.get('/verify', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  
  const token = authHeader.replace('Bearer ', '');
  const user = await dbGet('SELECT id, username, rol, nombre FROM usuarios WHERE id = ?', [token]);
  
  if (!user) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  
  res.json(user);
}));

// POST /api/auth/logout - Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout exitoso' });
});

export default router;
