// src/routes/dashboard.ts
import express from 'express';
import { 
  getDashboardStats,
  getDailyStats,
  getPopularServices,
  getOrdersNeedingAttention,
  getDashboardReport
} from '../controllers/dashboard/dashboardController';
import { exportDashboard } from '../controllers/dashboard/exportController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Toate rutele necesită autentificare
router.use(authenticateToken);

// GET /api/v1/dashboard/stats - Statistici principale dashboard
// Query params: period (today|week|month|year)
router.get('/stats', getDashboardStats);

// GET /api/v1/dashboard/daily-stats - Statistici zilnice pentru grafic
// Query params: days (numărul de zile, default 7, max 30)
router.get('/daily-stats', getDailyStats);

// GET /api/v1/dashboard/popular-services - Servicii populare
// Query params: limit (default 10), period (week|month|year)
router.get('/popular-services', getPopularServices);

// GET /api/v1/dashboard/attention - Comenzi care necesită atenție
router.get('/attention', getOrdersNeedingAttention);

// GET /api/v1/dashboard/report - Raport complet
// Query params: period, startDate, endDate
router.get('/report', getDashboardReport);

// GET /api/v1/dashboard/export - Export raport
// Query params: format (csv|json|pdf), period, startDate, endDate
router.get('/export', exportDashboard);

export default router;