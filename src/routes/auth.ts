// src/routes/auth.ts
import express from 'express';
import { 
  login, 
  register, 
  getCurrentUser, 
  updateProfile, 
  changePassword 
} from '../controllers/auth/authController';
import { validateLogin, validateRegister, validateUpdateProfile, validateChangePassword } from '../middleware/validation';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Rute publice (fără autentificare)
router.post('/login', validateLogin, login);

// Rute protejate (necesită autentificare)
router.get('/me', authenticateToken, getCurrentUser);
router.patch('/profile', authenticateToken, validateUpdateProfile, updateProfile);
router.patch('/change-password', authenticateToken, validateChangePassword, changePassword);

// Rute pentru admin (doar admin și super_admin pot crea utilizatori)
router.post('/register', authenticateToken, requireRole(['admin', 'super_admin']), validateRegister, register);

export default router;

