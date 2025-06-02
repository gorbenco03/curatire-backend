// src/app.ts - Actualizat cu rutele dashboard
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config/config';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Import routes
import orderRoutes from './routes/orders';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard'; // ✅ ADAUGĂ RUTA DASHBOARD

const app = express();

// Middleware de securitate
app.use(helmet());

// CORS
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/v1', (req, res, next) => {
  // Middleware pentru a adăuga header-e comune API
  res.header('API-Version', '1.0.0');
  res.header('Content-Type', 'application/json');
  next();
});

// Rutele aplicației
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes); // ✅ ADAUGĂ RUTA DASHBOARD

// Servire fișiere statice (QR codes, receipts)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Test endpoint pentru dezvoltare
if (config.nodeEnv === 'development') {
  app.get('/api/v1/test', (req, res) => {
    res.json({
      success: true,
      message: 'API funcționează!',
      timestamp: new Date().toISOString(),
      endpoints: {
        orders: {
          'POST /api/v1/orders': 'Creează comandă nouă',
          'GET /api/v1/orders': 'Lista comenzi cu filtrare',
          'GET /api/v1/orders/:id': 'Detalii comandă',
          'PATCH /api/v1/orders/:id/status': 'Actualizează status comandă'
        },
        dashboard: {
          'GET /api/v1/dashboard/stats': 'Statistici principale',
          'GET /api/v1/dashboard/daily-stats': 'Statistici zilnice',
          'GET /api/v1/dashboard/popular-services': 'Servicii populare',
          'GET /api/v1/dashboard/attention': 'Comenzi care necesită atenție',
          'GET /api/v1/dashboard/report': 'Raport complet'
        }
      }
    });
  });
}

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.originalUrl} nu a fost găsită`,
    availableEndpoints: config.nodeEnv === 'development' ? [
      'GET /health',
      'GET /api/v1/test',
      'POST /api/v1/orders',
      'GET /api/v1/orders',
      'GET /api/v1/dashboard/stats'
    ] : undefined
  });
});

// Error handling middleware
app.use(errorHandler);

export { app };