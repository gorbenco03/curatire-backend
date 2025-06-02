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
  scanByItemCode,
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
router.post('/', validateCreateOrder, createOrder);
router.get('/', getOrders);

// Rute statice pentru scanare
router.get('/scan-history', getScanHistory);
router.get('/scan-stats', getScanStats);
router.post('/scan', scanItem);
router.get('/find-item/:itemCode', findItemByCode);
router.post('/scan-by-itemcode', scanByItemCode);
// Rute dinamice pentru comenzi
router.get('/:id', getOrderById);
router.patch('/:id/status', updateOrderStatus);
router.get('/:id/qr-pdf', downloadOrderQRs);
router.post('/:id/invoice', generateInvoice);

// Rute pentru articole specifice
router.patch('/:id/items/:itemId/ready', markItemReady);
router.get('/:id/items/:itemId/status', getItemStatus);

export default router;