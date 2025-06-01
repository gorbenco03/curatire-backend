// src/routes/orders.ts - Updated with scanning endpoints
import express from 'express';
import { 
  createOrder, 
  getOrders, 
  getOrderById, 
  updateOrderStatus,
  downloadOrderQRs,
  generateInvoice
} from '../controllers/orders/orderController';
import {
  scanItem,
  markItemReady,
  getItemStatus,
  getScanHistory,
  getScanStats
} from '../controllers/scanning/scanController';
import { validateCreateOrder } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { findItemByCode } from '../controllers/scanning/scanController';
const router = express.Router();

// Toate rutele necesită autentificare
router.use(authenticateToken);

// Rute pentru comenzi
// POST /api/v1/orders - Creează o comandă nouă
router.post('/', validateCreateOrder, createOrder);

// GET /api/v1/orders - Obține toate comenzile cu filtrare și paginare
router.get('/', getOrders);

// GET /api/v1/orders/:id - Obține o comandă după ID
router.get('/:id', getOrderById);

// PATCH /api/v1/orders/:id/status - Actualizează statusul unei comenzi
router.patch('/:id/status', updateOrderStatus);

// GET /api/v1/orders/:id/qr-pdf - Descarcă PDF cu QR-uri
router.get('/:id/qr-pdf', downloadOrderQRs);

// POST /api/v1/orders/:id/invoice - Generează factură (descarcă sau trimite email)
router.post('/:id/invoice', generateInvoice);

// =====================================
// Rute pentru scanare QR
// =====================================

// POST /api/v1/orders/scan - Scanează un articol și îl marchează ca gata
router.post('/scan', scanItem);
router.get('/items/:itemCode', findItemByCode);
// PATCH /api/v1/orders/:id/items/:itemId/ready - Marchează un articol ca gata manual
router.patch('/:id/items/:itemId/ready', markItemReady);

// GET /api/v1/orders/:id/items/:itemId/status - Obține statusul unui articol
router.get('/:id/items/:itemId/status', getItemStatus);

// GET /api/v1/orders/scan-history - Obține istoricul scanărilor
router.get('/scan-history', getScanHistory);

// GET /api/v1/orders/scan-stats - Obține statistici de scanare
router.get('/scan-stats', getScanStats);

export default router;