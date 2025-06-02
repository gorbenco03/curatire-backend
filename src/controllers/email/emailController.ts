// src/controllers/emailController.ts - Pentru management și testare email-uri
import { Request, Response } from 'express';
import { Order, IOrderDocument } from '../../models/Order';
import { sendOrderReadyNotification, verifyEmailConnection } from '../../utils/emailService';
import { ApiResponse } from '../../types/index';
import { logger } from '../../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    location: string;
    name: string;
  };
}

// Trimite manual email de notificare pentru o comandă ready
export const sendReadyNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orderNumber } = req.params;
    const { force = false } = req.body; // Pentru a forța retrimiterea

    console.log(`📧 Cerere trimitere email manual pentru comanda ${orderNumber}`, {
      user: req.user?.name,
      force
    });

    // Găsește comanda
    const order = await Order.findOne({ orderNumber }) as IOrderDocument;

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Comanda nu a fost găsită'
      } as ApiResponse);
      return;
    }

    // Verifică permisiunile de locație (dacă nu e admin)
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      if (order.location !== req.user?.location) {
        res.status(403).json({
          success: false,
          message: 'Nu ai permisiunea să gestionezi comenzi din această locație'
        } as ApiResponse);
        return;
      }
    }

    // Verifică dacă comanda este ready
    if (order.status !== 'ready') {
      res.status(400).json({
        success: false,
        message: `Comanda nu este gata. Status actual: ${order.status}`,
        data: {
          orderNumber: order.orderNumber,
          status: order.status,
          readyItems: order.items.filter(item => item.status === 'ready').length,
          totalItems: order.items.length
        }
      } as ApiResponse);
      return;
    }

    // Verifică dacă clientul are email
    if (!order.customer.email) {
      res.status(400).json({
        success: false,
        message: 'Clientul nu are adresă de email configurată',
        data: {
          orderNumber: order.orderNumber,
          customerName: order.customer.name,
          customerPhone: order.customer.phone
        }
      } as ApiResponse);
      return;
    }

    // Verifică dacă email-ul a fost deja trimis (dacă nu e forțat)
    if (order.emailSent && !force) {
      res.status(400).json({
        success: false,
        message: 'Email-ul de notificare a fost deja trimis pentru această comandă',
        data: {
          orderNumber: order.orderNumber,
          emailSent: order.emailSent,
          customerEmail: order.customer.email,
          readyAt: order.readyAt
        }
      } as ApiResponse);
      return;
    }

    // Trimite email-ul
    await sendOrderReadyNotification(order);

    // Marchează că email-ul a fost trimis
    order.emailSent = true;
    await order.save();

    logger.info(`Email de notificare trimis manual pentru comanda ${order.orderNumber}`, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerEmail: order.customer.email,
      sentBy: req.user?.name || req.user?.id,
      forced: force
    });

    res.status(200).json({
      success: true,
      message: 'Email de notificare trimis cu succes',
      data: {
        orderNumber: order.orderNumber,
        customerEmail: order.customer.email,
        customerName: order.customer.name,
        sentAt: new Date(),
        forced: force
      }
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Eroare la trimiterea email-ului manual:', error);
    logger.error('Eroare la trimiterea email-ului manual:', {
      error: error instanceof Error ? error.message : String(error),
      orderNumber: req.params.orderNumber,
      user: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Eroare la trimiterea email-ului',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Verifică statusul email-ului pentru o comandă
export const getEmailStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber });

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Comanda nu a fost găsită'
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Status email obținut cu succes',
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        emailSent: order.emailSent || false,
        hasEmail: !!order.customer.email,
        customerEmail: order.customer.email,
        readyAt: order.readyAt,
        readyItems: order.items.filter(item => item.status === 'ready').length,
        totalItems: order.items.length,
        canSendEmail: order.status === 'ready' && !!order.customer.email
      }
    } as ApiResponse);

  } catch (error) {
    logger.error('Eroare la obținerea statusului email:', error);

    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea statusului email',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Obține lista comenzilor ready care nu au primit email
export const getPendingEmailNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      location
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Construiește filtrul
    const filter: any = {
      status: 'ready',
      $or: [
        { emailSent: false },
        { emailSent: { $exists: false } }
      ],
      'customer.email': { $exists: true, $nin: [null, ''] }
    };

    if (location && location !== 'all') {
      filter.location = location;
    }

    // Pentru utilizatori non-admin, filtrează după locația lor
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      filter.location = req.user?.location;
    }

    const orders = await Order.find(filter)
      .sort({ readyAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('orderNumber customer totalItems totalAmount readyAt location emailSent');

    const total = await Order.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      message: 'Comenzi fără notificare email obținute cu succes',
      data: orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalItems: total,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    } as ApiResponse);

  } catch (error) {
    logger.error('Eroare la obținerea comenzilor fără notificare:', error);

    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea comenzilor fără notificare',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Trimite email-uri în lot pentru comenzile ready fără notificare
export const sendBulkReadyNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orderNumbers, location } = req.body;

    // Verifică permisiunile
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      res.status(403).json({
        success: false,
        message: 'Nu ai permisiunea să trimiți email-uri în lot'
      } as ApiResponse);
      return;
    }

    console.log(`📧 Trimitere email-uri în lot pentru ${orderNumbers?.length || 'toate'} comenzile`, {
      user: req.user?.name,
      orderNumbers,
      location
    });

    // Construiește filtrul
    const filter: any = {
      status: 'ready',
      $or: [
        { emailSent: false },
        { emailSent: { $exists: false } }
      ],
      'customer.email': { $exists: true, $nin: [null, ''] }
    };

    if (orderNumbers && orderNumbers.length > 0) {
      filter.orderNumber = { $in: orderNumbers };
    }

    if (location && location !== 'all') {
      filter.location = location;
    }

    const orders = await Order.find(filter).limit(50); // Limitează la 50 pentru siguranță

    const results = {
      total: orders.length,
      sent: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Trimite email-urile unul câte unul
    for (const order of orders) {
      try {
        await sendOrderReadyNotification(order);
        
        // Marchează că email-ul a fost trimis
        order.emailSent = true;
        await order.save();
        
        results.sent++;
        
        console.log(`✅ Email trimis pentru comanda ${order.orderNumber}`);
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          orderNumber: order.orderNumber,
          error: error instanceof Error ? error.message : String(error)
        });
        
        console.error(`❌ Eroare la trimiterea email pentru comanda ${order.orderNumber}:`, error);
      }
      
      // Pauză scurtă între email-uri pentru a evita spam-ul
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info(`Trimitere email-uri în lot finalizată`, {
      total: results.total,
      sent: results.sent,
      failed: results.failed,
      user: req.user?.name
    });

    res.status(200).json({
      success: true,
      message: `Email-uri trimise: ${results.sent}/${results.total}`,
      data: results
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Eroare la trimiterea email-urilor în lot:', error);
    logger.error('Eroare la trimiterea email-urilor în lot:', error);

    res.status(500).json({
      success: false,
      message: 'Eroare la trimiterea email-urilor în lot',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Verifică conexiunea SMTP
export const checkEmailConnection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    console.log('🔧 Verificare conexiune SMTP...', { user: req.user?.name });

    const isConnected = await verifyEmailConnection();

    res.status(200).json({
      success: true,
      message: isConnected ? 'Conexiune SMTP funcțională' : 'Conexiune SMTP eșuată',
      data: {
        connected: isConnected,
        checkedAt: new Date()
      }
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Eroare la verificarea conexiunii SMTP:', error);

    res.status(500).json({
      success: false,
      message: 'Eroare la verificarea conexiunii SMTP',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Testează trimiterea unui email
export const sendTestEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orderNumber } = req.body;

    if (!orderNumber) {
      res.status(400).json({
        success: false,
        message: 'Numărul comenzii este obligatoriu pentru test'
      } as ApiResponse);
      return;
    }

    const order = await Order.findOne({ orderNumber }) as IOrderDocument;

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Comanda nu a fost găsită'
      } as ApiResponse);
      return;
    }

    if (!order.customer.email) {
      res.status(400).json({
        success: false,
        message: 'Comanda nu are email de client configurat'
      } as ApiResponse);
      return;
    }

    // Temporar setează comanda ca ready pentru test
    const originalStatus = order.status;
    const originalReadyAt = order.readyAt;
    
    order.status = 'ready';
    if (!order.readyAt) {
      order.readyAt = new Date();
    }

    // Trimite email-ul de test
    await sendOrderReadyNotification(order);

    // Restabilește statusul original (nu salvăm modificările)
    order.status = originalStatus;
    order.readyAt = originalReadyAt;

    console.log(`📧 Email de test trimis pentru comanda ${order.orderNumber}`);

    res.status(200).json({
      success: true,
      message: 'Email de test trimis cu succes',
      data: {
        orderNumber: order.orderNumber,
        customerEmail: order.customer.email,
        sentAt: new Date(),
        note: 'Acesta a fost un email de test - statusul comenzii nu a fost modificat'
      }
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Eroare la trimiterea email-ului de test:', error);

    res.status(500).json({
      success: false,
      message: 'Eroare la trimiterea email-ului de test',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};