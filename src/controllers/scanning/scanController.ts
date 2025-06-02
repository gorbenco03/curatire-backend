// src/controllers/scanning/scanController.ts - Updated with itemCode support
import { Request, Response } from 'express';
import { Order, IOrderDocument } from '../../models/Order';
import { ApiResponse } from '../../types';
import { logger } from '../../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    location: string;
    name: string;
  };
}

interface ScanItemRequest {
  orderId: string;
  itemId: string;
  scannedBy: string;
  notes?: string;
}

interface ItemCodeScanRequest {
  itemCode: string;
  scannedBy: string;
  notes?: string;
}

// Scanează un articol prin itemCode
export const scanByItemCode = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { itemCode, notes }: ItemCodeScanRequest = req.body;
    
    console.log('🔍 Scanare prin itemCode:', { itemCode, user: req.user?.name });

    // Validare de bază
    if (!itemCode) {
      res.status(400).json({
        success: false,
        message: 'ItemCode este obligatoriu'
      } as ApiResponse);
      return;
    }

    // Validează formatul itemCode (CMD12345_1_1)
    const itemCodePattern = /^CMD[A-Z0-9]{5}_\d+_\d+$/;
    if (!itemCodePattern.test(itemCode.trim())) {
      res.status(400).json({
        success: false,
        message: 'Format itemCode invalid. Folosește formatul: CMD123456_1_1'
      } as ApiResponse);
      return;
    }

    // Găsește comanda care conține acest itemCode
    const order = await Order.findOne({
      'items.itemCode': itemCode.trim()
    }) as IOrderDocument;

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Articolul cu acest cod nu a fost găsit'
      } as ApiResponse);
      return;
    }

    // Verifică permisiunile de locație (dacă nu e admin)
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      if (order.location !== req.user?.location) {
        res.status(403).json({
          success: false,
          message: 'Nu ai permisiunea să scanezi articole din această locație'
        } as ApiResponse);
        return;
      }
    }

    // Găsește articolul în comandă
    const itemIndex = order.items.findIndex(item => item.itemCode === itemCode.trim());

    if (itemIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Articolul nu a fost găsit în comandă'
      } as ApiResponse);
      return;
    }

    const item = order.items[itemIndex];

    // Verifică dacă articolul nu e deja gata
    if (item.status === 'ready') {
      res.status(400).json({
        success: false,
        message: 'Acest articol este deja marcat ca gata',
        data: {
          orderId: order._id,
          itemId: item._id,
          orderNumber: order.orderNumber,
          serviceName: item.serviceName,
          customerName: order.customer.name,
          scannedAt: item.scannedAt,
          status: item.status
        }
      } as ApiResponse);
      return;
    }

    // Actualizează articolul
    order.items[itemIndex].status = 'ready';
    order.items[itemIndex].scannedAt = new Date();
    order.items[itemIndex].scannedBy = req.user?.id || req.user?.name || 'unknown';
    
    if (notes) {
      order.items[itemIndex].notes = notes;
    }

    // Salvează comanda (middleware-ul va actualiza automat statusul general)
    await order.save();

    // Log activitatea
    logger.info(`Articol scanat prin itemCode: ${item.itemCode}`, {
      orderId: order._id,
      itemId: item._id,
      orderNumber: order.orderNumber,
      serviceName: item.serviceName,
      scannedBy: req.user?.name || req.user?.id,
      location: order.location,
      method: 'itemCode'
    });

    console.log('✅ Articol scanat cu succes prin itemCode:', {
      orderNumber: order.orderNumber,
      itemCode: item.itemCode,
      serviceName: item.serviceName
    });

    res.status(200).json({
      success: true,
      message: 'Articol scanat cu succes',
      data: {
        orderId: order._id,
        itemId: item._id,
        orderNumber: order.orderNumber,
        serviceName: item.serviceName,
        customerName: order.customer.name,
        scannedAt: order.items[itemIndex].scannedAt,
        status: order.items[itemIndex].status,
        orderStatus: order.status
      }
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Eroare la scanarea prin itemCode:', error);
    logger.error('Eroare la scanarea prin itemCode:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
      user: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Eroare la scanarea articolului',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Găsește un articol după itemCode (pentru preview)
export const findItemByCode = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { itemCode } = req.params;
    
    console.log('🔎 Căutare articol după itemCode:', { itemCode, user: req.user?.name });

    // Validare de bază
    if (!itemCode) {
      res.status(400).json({
        success: false,
        message: 'ItemCode este obligatoriu'
      } as ApiResponse);
      return;
    }

    // Găsește comanda care conține acest itemCode
    const order = await Order.findOne({
      'items.itemCode': itemCode.trim()
    }) as IOrderDocument;

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Articolul cu acest cod nu a fost găsit'
      } as ApiResponse);
      return;
    }

    // Găsește articolul în comandă
    const item = order.items.find(item => item.itemCode === itemCode.trim());

    if (!item) {
      res.status(404).json({
        success: false,
        message: 'Articolul nu a fost găsit în comandă'
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Articol găsit',
      data: {
        orderId: order._id,
        itemId: item._id,
        itemCode: item.itemCode,
        orderNumber: order.orderNumber,
        serviceName: item.serviceName,
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        status: item.status,
        scannedAt: item.scannedAt,
        scannedBy: item.scannedBy,
        notes: item.notes,
        orderStatus: order.status,
        location: order.location
      }
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Eroare la căutarea articolului:', error);
    logger.error('Eroare la căutarea articolului după itemCode:', {
      error: error instanceof Error ? error.message : String(error),
      itemCode: req.params.itemCode,
      user: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Eroare la căutarea articolului',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Scanează un articol și îl marchează ca gata (QR traditional)
export const scanItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orderId, itemId, notes }: ScanItemRequest = req.body;
    
    console.log('🔍 Scanare articol prin QR traditional:', { orderId, itemId, user: req.user?.name });

    // Validare de bază
    if (!orderId || !itemId) {
      res.status(400).json({
        success: false,
        message: 'ID-ul comenzii și ID-ul articolului sunt obligatorii'
      } as ApiResponse);
      return;
    }

    // Găsește comanda
    const order = await Order.findById(orderId) as IOrderDocument;

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
          message: 'Nu ai permisiunea să scanezi articole din această locație'
        } as ApiResponse);
        return;
      }
    }

    // Găsește articolul în comandă
    const itemIndex = order.items.findIndex(item => 
      item._id?.toString() === itemId || item.itemCode === itemId
    );

    if (itemIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Articolul nu a fost găsit în comandă'
      } as ApiResponse);
      return;
    }

    const item = order.items[itemIndex];

    // Verifică dacă articolul nu e deja gata
    if (item.status === 'ready') {
      res.status(400).json({
        success: false,
        message: 'Acest articol este deja marcat ca gata',
        data: {
          orderId: order._id,
          itemId: item._id,
          orderNumber: order.orderNumber,
          serviceName: item.serviceName,
          customerName: order.customer.name,
          scannedAt: item.scannedAt,
          status: item.status
        }
      } as ApiResponse);
      return;
    }

    // Actualizează articolul
    order.items[itemIndex].status = 'ready';
    order.items[itemIndex].scannedAt = new Date();
    order.items[itemIndex].scannedBy = req.user?.id || req.user?.name || 'unknown';
    
    if (notes) {
      order.items[itemIndex].notes = notes;
    }

    // Salvează comanda (middleware-ul va actualiza automat statusul general)
    await order.save();

    // Log activitatea
    logger.info(`Articol scanat prin QR: ${item.itemCode}`, {
      orderId: order._id,
      itemId: item._id,
      orderNumber: order.orderNumber,
      serviceName: item.serviceName,
      scannedBy: req.user?.name || req.user?.id,
      location: order.location,
      method: 'QR'
    });

    console.log('✅ Articol scanat cu succes prin QR:', {
      orderNumber: order.orderNumber,
      itemCode: item.itemCode,
      serviceName: item.serviceName
    });

    res.status(200).json({
      success: true,
      message: 'Articol scanat cu succes',
      data: {
        orderId: order._id,
        itemId: item._id,
        orderNumber: order.orderNumber,
        serviceName: item.serviceName,
        customerName: order.customer.name,
        scannedAt: order.items[itemIndex].scannedAt,
        status: order.items[itemIndex].status,
        orderStatus: order.status
      }
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Eroare la scanarea articolului prin QR:', error);
    logger.error('Eroare la scanarea articolului prin QR:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
      user: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Eroare la scanarea articolului',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Marchează un articol ca gata fără scanare QR
export const markItemReady = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: orderId, itemId } = req.params;
    const { notes } = req.body;

    console.log('📝 Marcare articol ca gata:', { orderId, itemId, user: req.user?.name });

    const order = await Order.findById(orderId) as IOrderDocument;

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
          message: 'Nu ai permisiunea să modifici articole din această locație'
        } as ApiResponse);
        return;
      }
    }

    // Găsește articolul
    const itemIndex = order.items.findIndex(item => 
      item._id?.toString() === itemId || item.itemCode === itemId
    );

    if (itemIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Articolul nu a fost găsit în comandă'
      } as ApiResponse);
      return;
    }

    // Actualizează articolul
    order.items[itemIndex].status = 'ready';
    order.items[itemIndex].scannedAt = new Date();
    order.items[itemIndex].scannedBy = req.user?.id || req.user?.name || 'manual';
    
    if (notes) {
      order.items[itemIndex].notes = notes;
    }

    await order.save();

    logger.info(`Articol marcat ca gata manual: ${order.items[itemIndex].itemCode}`, {
      orderId: order._id,
      itemId: order.items[itemIndex]._id,
      orderNumber: order.orderNumber,
      markedBy: req.user?.name || req.user?.id
    });

    res.status(200).json({
      success: true,
      message: 'Articol marcat ca gata',
      data: {
        orderId: order._id,
        itemId: order.items[itemIndex]._id,
        orderNumber: order.orderNumber,
        serviceName: order.items[itemIndex].serviceName,
        customerName: order.customer.name,
        scannedAt: order.items[itemIndex].scannedAt,
        status: order.items[itemIndex].status,
        orderStatus: order.status
      }
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Eroare la marcarea articolului:', error);
    logger.error('Eroare la marcarea articolului ca gata:', error);

    res.status(500).json({
      success: false,
      message: 'Eroare la marcarea articolului',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Obține statusul unui articol
export const getItemStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: orderId, itemId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Comanda nu a fost găsită'
      } as ApiResponse);
      return;
    }

    const item = order.items.find(item => 
      item._id?.toString() === itemId || item.itemCode === itemId
    );

    if (!item) {
      res.status(404).json({
        success: false,
        message: 'Articolul nu a fost găsit în comandă'
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Status articol obținut cu succes',
      data: {
        orderId: order._id,
        itemId: item._id,
        itemCode: item.itemCode,
        orderNumber: order.orderNumber,
        serviceName: item.serviceName,
        customerName: order.customer.name,
        status: item.status,
        scannedAt: item.scannedAt,
        scannedBy: item.scannedBy,
        notes: item.notes,
        orderStatus: order.status
      }
    } as ApiResponse);

  } catch (error) {
    logger.error('Eroare la obținerea statusului articolului:', error);

    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea statusului articolului',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Obține istoricul scanărilor
export const getScanHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      scannedBy,
      location
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Construiește filtrul pentru agregare
    const matchFilter: any = {
      'items.scannedAt': { $exists: true, $ne: null }
    };

    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = new Date(startDate as string);
      if (endDate) dateFilter.$lte = new Date(endDate as string);
      matchFilter['items.scannedAt'] = dateFilter;
    }

    if (scannedBy) {
      matchFilter['items.scannedBy'] = { $regex: scannedBy, $options: 'i' };
    }

    if (location && location !== 'all') {
      matchFilter.location = location;
    }

    // Pentru utilizatori non-admin, filtrează după locația lor
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      matchFilter.location = req.user?.location;
    }

    // Agregare pentru a obține toate scanările
    const scanHistory = await Order.aggregate([
      { $match: matchFilter },
      { $unwind: '$items' },
      { 
        $match: { 
          'items.scannedAt': { $exists: true, $ne: null },
          ...(scannedBy && { 'items.scannedBy': { $regex: scannedBy, $options: 'i' } })
        } 
      },
      {
        $project: {
          _id: '$items._id',
          orderId: '$_id',
          orderNumber: 1,
          itemCode: '$items.itemCode',
          serviceName: '$items.serviceName',
          customerName: '$customer.name',
          customerPhone: '$customer.phone',
          status: '$items.status',
          scannedAt: '$items.scannedAt',
          scannedBy: '$items.scannedBy',
          notes: '$items.notes',
          location: 1,
          orderStatus: '$status'
        }
      },
      { $sort: { scannedAt: -1 } },
      { $skip: skip },
      { $limit: limitNum }
    ]);

    // Numără totalul pentru paginare
    const totalCount = await Order.aggregate([
      { $match: matchFilter },
      { $unwind: '$items' },
      { 
        $match: { 
          'items.scannedAt': { $exists: true, $ne: null },
          ...(scannedBy && { 'items.scannedBy': { $regex: scannedBy, $options: 'i' } })
        } 
      },
      { $count: 'total' }
    ]);

    const totalItems = totalCount.length > 0 ? totalCount[0].total : 0;
    const totalPages = Math.ceil(totalItems / limitNum);

    res.status(200).json({
      success: true,
      message: 'Istoric scanări obținut cu succes',
      data: scanHistory,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalItems,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    logger.error('Eroare la obținerea istoricului scanărilor:', error);

    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea istoricului scanărilor',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Obține statistici de scanare
export const getScanStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, location } = req.query;

    const matchFilter: any = {};

    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = new Date(startDate as string);
      if (endDate) dateFilter.$lte = new Date(endDate as string);
      matchFilter.createdAt = dateFilter;
    }

    if (location && location !== 'all') {
      matchFilter.location = location;
    }

    // Pentru utilizatori non-admin, filtrează după locația lor
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      matchFilter.location = req.user?.location;
    }

    const stats = await Order.aggregate([
      { $match: matchFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          scannedItems: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$items.scannedAt', null] }, { $ne: ['$items.scannedAt', undefined] }] },
                1,
                0
              ]
            }
          },
          readyItems: {
            $sum: {
              $cond: [{ $eq: ['$items.status', 'ready'] }, 1, 0]
            }
          },
          pendingItems: {
            $sum: {
              $cond: [{ $eq: ['$items.status', 'pending'] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalItems: 1,
          scannedItems: 1,
          readyItems: 1,
          pendingItems: 1,
          scanRate: {
            $cond: [
              { $gt: ['$totalItems', 0] },
              { $multiply: [{ $divide: ['$scannedItems', '$totalItems'] }, 100] },
              0
            ]
          },
          completionRate: {
            $cond: [
              { $gt: ['$totalItems', 0] },
              { $multiply: [{ $divide: ['$readyItems', '$totalItems'] }, 100] },
              0
            ]
          }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalItems: 0,
      scannedItems: 0,
      readyItems: 0,
      pendingItems: 0,
      scanRate: 0,
      completionRate: 0
    };

    res.status(200).json({
      success: true,
      message: 'Statistici scanare obținute cu succes',
      data: result
    } as ApiResponse);

  } catch (error) {
    logger.error('Eroare la obținerea statisticilor de scanare:', error);

    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea statisticilor',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};