// src/controllers/orders/orderController.ts - Complet corectat
import { Request, Response } from 'express';
import { Order, IOrderDocument } from '../../models/Order';
import { ApiResponse, CreateOrderRequest } from '../../types';
import { logger } from '../../utils/logger';
import { generateQRCode, generateItemId } from '../../utils/qrGenerator';
import { generateOrderPDF, generateInvoicePDF } from '../../utils/pdfGenerator';
import { sendInvoiceEmail } from '../../utils/emailService';
import path from 'path';
import fs from 'fs';

// Interfață pentru request cu user autentificat
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    location: string;
  };
}

// Creează o comandă nouă cu generare QR
export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    console.log('🔍 Request Body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 User:', req.user);

    const { customer, items, notes }: CreateOrderRequest = req.body;
    
    // Validare de bază
    if (!customer || !customer.name || !customer.phone) {
      console.log('❌ Validare customer eșuată:', { customer });
      res.status(400).json({
        success: false,
        message: 'Datele clientului sunt incomplete'
      } as ApiResponse);
      return;
    }

    if (!items || items.length === 0) {
      console.log('❌ Validare items eșuată:', { items });
      res.status(400).json({
        success: false,
        message: 'Comanda trebuie să aibă cel puțin un articol'
      } as ApiResponse);
      return;
    }

    console.log('✅ Validările au trecut');

    // Calculează totale
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    console.log('📊 Totale calculate:', { totalAmount, totalItems });

    // Generează numărul comenzii
 const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; // Set de caractere alfanumerice
let orderNumber = 'CMD';
for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    orderNumber += characters[randomIndex];
}

    console.log('🔢 Numărul comenzii generat:', orderNumber);

    // Procesează articolele - NU include _id, lasă Mongoose să-l genereze
    const orderItemsWithQR = items.flatMap((item, index) => {
      const individualItems: any[] = [];
      let itemCounter = 1;
      
      for (let j = 0; j < item.quantity; j++) {
        const itemCode = `${orderNumber}_${index + 1}_${itemCounter}`;
        individualItems.push({
          itemCode: itemCode,
          serviceCode: item.serviceCode,
          serviceName: item.serviceName,
          quantity: 1,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice,
          status: 'pending' as const,
          notes: item.notes,
          qrCode: 'pending', // Placeholder, va fi actualizat după salvare
          qrCodePath: ''
        });
        itemCounter++;
      }
      return individualItems;
    });

    console.log('📦 Articole procesate:', orderItemsWithQR.length);

    // Creează comanda
    const orderData = {
      orderNumber,
      customer,
      items: orderItemsWithQR,
      totalAmount,
      totalItems,
      status: 'pending' as const,
      location: req.user?.location || 'Sediul Principal',
      notes,
      createdBy: req.user?.id || 'system'
    };

    console.log('📝 Date comandă pentru salvare:', JSON.stringify(orderData, null, 2));

    const newOrder = new Order(orderData);

    console.log('🏗️ Obiect Order creat, încercăm să salvăm...');

    // Salvează în baza de date
    const savedOrder = await newOrder.save();

    console.log('✅ Comanda salvată cu succes:', savedOrder._id);
    console.log('📋 Articole salvate cu _id:', savedOrder.items.map(item => ({ 
      _id: item._id, 
      itemCode: item.itemCode 
    })));

    // Generează QR-uri pentru fiecare articol
    try {
      for (let i = 0; i < savedOrder.items.length; i++) {
        const item = savedOrder.items[i];
        const qrData = {
          orderId: savedOrder._id.toString(),
          orderNumber: savedOrder.orderNumber,
          itemId: item._id!.toString(),
          itemCode: item.itemCode,
          serviceCode: item.serviceCode,
          serviceName: item.serviceName,
          customerName: customer.name,
          customerPhone: customer.phone
        };

        try {
          const qrCodePath = await generateQRCode(qrData);
          
          // Actualizează direct în document
          savedOrder.items[i].qrCode = JSON.stringify(qrData);
          savedOrder.items[i].qrCodePath = qrCodePath;
          
          console.log(`✅ QR generat pentru articol ${item.itemCode}`);
        } catch (qrError) {
          console.error(`❌ Eroare la generarea QR pentru articol ${item.itemCode}:`, qrError);
          // Continuă cu următorul articol
        }
      }

      // Salvează din nou cu QR-urile actualizate
      await savedOrder.save();
      console.log('✅ Toate QR-urile au fost generate și salvate');

    } catch (error) {
      console.error('⚠️ Eroare la generarea QR-urilor, dar comanda a fost salvată:', error);
      // Comanda există, doar QR-urile nu s-au generat complet
    }

    logger.info(`Comandă creată: ${orderNumber}`, {
      orderId: savedOrder._id,
      customer: customer.phone,
      totalAmount,
      totalItems,
      createdBy: req.user?.id
    });

    res.status(201).json({
      success: true,
      message: 'Comanda a fost creată cu succes',
      data: savedOrder
    } as ApiResponse);

  } catch (error) {
    console.log('❌ Eroare detaliată:', error);
    logger.error('Eroare la crearea comenzii:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body
    });

    res.status(500).json({
      success: false,
      message: 'Eroare la crearea comenzii',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Descarcă PDF cu QR-uri
export const downloadOrderQRs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Comanda nu a fost găsită'
      } as ApiResponse);
      return;
    }

    // Generează PDF-ul
    const pdfPath = await generateOrderPDF(order);

    // Trimite PDF-ul
    res.download(pdfPath, `QR_${order.orderNumber}.pdf`, (err) => {
      // Șterge fișierul după trimitere
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
      
      if (err) {
        logger.error('Eroare la descărcarea PDF:', err);
        res.status(500).json({
          success: false,
          message: 'Eroare la descărcarea PDF-ului'
        });
      }
    });

  } catch (error) {
    logger.error('Eroare la generarea PDF cu QR-uri:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la generarea PDF-ului',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Generează și trimite factura
export const generateInvoice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { sendEmail } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Comanda nu a fost găsită'
      } as ApiResponse);
      return;
    }

    // Generează factura PDF
    const invoicePath = await generateInvoicePDF(order);

    if (sendEmail && order.customer.email) {
      // Trimite pe email
      await sendInvoiceEmail(order.customer.email, order, invoicePath);
      
      // Șterge fișierul după trimitere
      if (fs.existsSync(invoicePath)) {
        fs.unlinkSync(invoicePath);
      }

      res.status(200).json({
        success: true,
        message: 'Factura a fost trimisă pe email'
      } as ApiResponse);
    } else {
      // Descarcă factura
      res.download(invoicePath, `Factura_${order.orderNumber}.pdf`, (err) => {
        // Șterge fișierul după trimitere
        if (fs.existsSync(invoicePath)) {
          fs.unlinkSync(invoicePath);
        }
        
        if (err) {
          logger.error('Eroare la descărcarea facturii:', err);
          res.status(500).json({
            success: false,
            message: 'Eroare la descărcarea facturii'
          });
        }
      });
    }

  } catch (error) {
    logger.error('Eroare la generarea facturii:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la generarea facturii',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Obține toate comenzile cu filtrare și paginare
export const getOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      startDate,
      endDate,
      location
    } = req.query;

    // Construiește filtrul
    const filter: any = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    if (location && location !== 'all') {
      filter.location = location;
    }

    // Pentru utilizatori non-admin, filtrează după locația lor
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      filter.location = req.user?.location;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Execută query-ul
    const [orders, totalItemsCount] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalItemsCount / limitNum);

    res.status(200).json({
      success: true,
      message: 'Comenzi obținute cu succes',
      data: orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalItems: totalItemsCount,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.log('❌ Eroare la obținerea comenzilor:', error);
    logger.error('Eroare la obținerea comenzilor:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea comenzilor',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Obține o comandă după ID
export const getOrderById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Comanda nu a fost găsită'
      } as ApiResponse);
      return;
    }

    // Verifică permisiunile
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      if (order.location !== req.user?.location) {
        res.status(403).json({
          success: false,
          message: 'Nu ai permisiunea să vezi această comandă'
        } as ApiResponse);
        return;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Comandă obținută cu succes',
      data: order
    } as ApiResponse);

  } catch (error) {
    logger.error('Eroare la obținerea comenzii:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea comenzii',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Actualizează statusul unei comenzi
export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const order = await Order.findById(id) as IOrderDocument;

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Comanda nu a fost găsită'
      } as ApiResponse);
      return;
    }

    // Verifică permisiunile
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      if (order.location !== req.user?.location) {
        res.status(403).json({
          success: false,
          message: 'Nu ai permisiunea să modifici această comandă'
        } as ApiResponse);
        return;
      }
    }

    // Actualizează statusul
    order.status = status;
    if (notes) order.notes = notes;

    if (status === 'completed') {
      order.collectedAt = new Date();
    }

    await order.save();

    logger.info(`Status comandă actualizat: ${order.orderNumber}`, {
      orderId: order._id,
      newStatus: status,
      updatedBy: req.user?.id
    });

    res.status(200).json({
      success: true,
      message: 'Statusul comenzii a fost actualizat',
      data: order
    } as ApiResponse);

  } catch (error) {
    logger.error('Eroare la actualizarea statusului comenzii:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la actualizarea statusului comenzii',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

export const getOrdersNeedingAttention = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orders = await Order.find({
      $or: [
        { status: 'in_progress', updatedAt: { $lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } }, // Comenzi în procesare de peste 3 zile
        { status: 'ready', readyAt: { $lte: new Date() } }, // Comenzi gata de ridicat
      ],
    }).limit(10);

    res.status(200).json({
      success: true,
      message: 'Comenzi care necesită atenție obținute cu succes',
      data: orders,
    } as ApiResponse);
  } catch (error) {
    logger.error('Eroare la obținerea comenzilor care necesită atenție:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea comenzilor',
      error: error instanceof Error ? error.message : 'Eroare necunoscută',
    } as ApiResponse);
  }
};




