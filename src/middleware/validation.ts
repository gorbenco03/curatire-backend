import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { ApiResponse } from '../types';
import { isValidPhone, isValidEmail } from '../utils/helpers';

// Middleware pentru validarea erorilor
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages: { [key: string]: string } = {};
    
    errors.array().forEach(error => {
      if (error.type === 'field') {
        errorMessages[error.path] = error.msg;
      }
    });
    
    res.status(400).json({
      success: false,
      message: 'Date de intrare invalide',
      errors: errorMessages
    } as ApiResponse);
    return;
  }
  
  next();
};

// Validări pentru crearea comenzii
export const validateCreateOrder = [
  // Validare customer
  body('customer.name')
    .trim()
    .notEmpty()
    .withMessage('Numele clientului este obligatoriu')
    .isLength({ min: 2, max: 100 })
    .withMessage('Numele trebuie să aibă între 2 și 100 de caractere'),
    
  body('customer.phone')
    .trim()
    .notEmpty()
    .withMessage('Telefonul clientului este obligatoriu')
    .custom((value) => {
      if (!isValidPhone(value)) {
        throw new Error('Format telefon invalid');
      }
      return true;
    }),
    
  body('customer.email')
    .optional()
    .trim()
    .custom((value) => {
      if (value && !isValidEmail(value)) {
        throw new Error('Format email invalid');
      }
      return true;
    }),
    
  // Validare items
  body('items')
    .isArray({ min: 1 })
    .withMessage('Comanda trebuie să aibă cel puțin un articol'),
    
  body('items.*.serviceCode')
    .trim()
    .notEmpty()
    .withMessage('Codul serviciului este obligatoriu'),
    
  body('items.*.serviceName')
    .trim()
    .notEmpty()
    .withMessage('Numele serviciului este obligatoriu'),
    
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Cantitatea trebuie să fie un număr întreg pozitiv'),
    
  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Prețul unitar trebuie să fie un număr pozitiv'),
    
  body('items.*.notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notele nu pot depăși 500 de caractere'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notele generale nu pot depăși 1000 de caractere'),
    
  handleValidationErrors
];



// Validări pentru login
export const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email-ul este obligatoriu')
    .isEmail()
    .withMessage('Format email invalid')
    .normalizeEmail(),
    
  body('password')
    .notEmpty()
    .withMessage('Parola este obligatorie'),
    
  handleValidationErrors
];

// Validări pentru înregistrare
export const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Numele este obligatoriu')
    .isLength({ min: 2, max: 100 })
    .withMessage('Numele trebuie să aibă între 2 și 100 de caractere'),
    
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email-ul este obligatoriu')
    .isEmail()
    .withMessage('Format email invalid')
    .normalizeEmail(),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Parola trebuie să aibă cel puțin 6 caractere'),
    
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
    .isIn(['receptie', 'procesare', 'admin', 'super_admin'])
    .withMessage('Rol invalid'),
    
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Locația este obligatorie'),
    
  handleValidationErrors
];

// Validări pentru actualizarea profilului
export const validateUpdateProfile = [
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
    
  handleValidationErrors
];

// Validări pentru schimbarea parolei
export const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Parola curentă este obligatorie'),
    
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Noua parolă trebuie să aibă cel puțin 6 caractere'),
    
  handleValidationErrors
];