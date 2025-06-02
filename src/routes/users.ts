// src/routes/users.ts
import express from 'express';
import { 
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
  resetUserPassword,
  getUserStats
} from '../controllers/users/userController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { body } from 'express-validator';
import { isValidPhone } from '../utils/helpers';

const router = express.Router();

// Toate rutele necesită autentificare
router.use(authenticateToken);

// Toate rutele necesită rol de admin sau super_admin
router.use(requireRole(['admin', 'super_admin']));

// GET /api/v1/users - Obține lista utilizatorilor
router.get('/', getUsers);

// GET /api/v1/users/stats - Obține statistici utilizatori
router.get('/stats', getUserStats);

// GET /api/v1/users/:id - Obține un utilizator după ID
router.get('/:id', getUserById);

// Validări pentru actualizare utilizator
const validateUpdateUser = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Numele trebuie să aibă între 2 și 100 de caractere'),
    
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Format email invalid')
    .normalizeEmail(),
    
  body('phone')
    .optional()
    .trim()
    .custom((value) => {
      if (value && !isValidPhone(value)) {
        throw new Error('Format telefon invalid');
      }
      return true;
    }),
    
  body('role')
    .optional()
    .isIn(['receptie', 'procesare', 'admin', 'super_admin'])
    .withMessage('Rol invalid'),
    
  body('location')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Locația nu poate fi goală'),
    
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Status invalid'),
    
  handleValidationErrors
];

// Validări pentru resetarea parolei
const validateResetPassword = [
  body('newPassword')
    .notEmpty()
    .withMessage('Parola nouă este obligatorie')
    .isLength({ min: 6 })
    .withMessage('Parola trebuie să aibă cel puțin 6 caractere'),
    
  handleValidationErrors
];

// PUT /api/v1/users/:id - Actualizează un utilizator
router.put('/:id', validateUpdateUser, updateUser);

// PATCH /api/v1/users/:id/toggle-status - Comută status activ/inactiv
router.patch('/:id/toggle-status', toggleUserStatus);

// PATCH /api/v1/users/:id/reset-password - Resetează parola
router.patch('/:id/reset-password', validateResetPassword, resetUserPassword);

// DELETE /api/v1/users/:id - Șterge un utilizator
router.delete('/:id', deleteUser);

export default router;