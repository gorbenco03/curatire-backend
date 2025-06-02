// src/routes/emailRoutes.ts - Rute pentru management email-uri
import { Router } from 'express';
import {
  sendReadyNotification,
  getEmailStatus,
  getPendingEmailNotifications,
  sendBulkReadyNotifications,
  checkEmailConnection,
  sendTestEmail
} from '../controllers/email/emailController';
import { authenticateToken } from '../middleware/auth';


const router = Router();

// Middleware de autentificare pentru toate rutele
router.use(authenticateToken);

// GET /api/emails/check-connection - Verifică conexiunea SMTP
router.get('/check-connection', checkEmailConnection);

// GET /api/emails/status/:orderNumber - Verifică statusul email-ului pentru o comandă
router.get('/status/:orderNumber', getEmailStatus);

// POST /api/emails/send/:orderNumber - Trimite manual email de notificare pentru o comandă
router.post('/send/:orderNumber', sendReadyNotification);

// GET /api/emails/pending - Obține comenzile ready fără notificare email
router.get('/pending', getPendingEmailNotifications);

// POST /api/emails/send-bulk - Trimite email-uri în lot (doar admini)
router.post('/send-bulk',  sendBulkReadyNotifications);

// POST /api/emails/test - Trimite email de test
router.post('/test', sendTestEmail);

export default router;