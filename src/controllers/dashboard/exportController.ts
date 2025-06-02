// src/controllers/dashboard/exportController.ts
import { Request, Response } from 'express';
import { Order } from '../../models/Order';
import { ApiResponse } from '../../types';
import { logger } from '../../utils/logger';


// Interfață pentru request cu user autentificat
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    location: string;
  };
}

/**
 * Exportă raportul dashboard în format CSV
 */
export const exportDashboardCSV = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { period = 'month', startDate: queryStartDate, endDate: queryEndDate } = req.query;

    // Determină perioada
    let startDate: Date;
    let endDate: Date;

    if (queryStartDate && queryEndDate) {
      startDate = new Date(queryStartDate as string);
      endDate = new Date(queryEndDate as string);
    } else {
      const now = new Date();
      endDate = now;
      startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(now.getMonth() - 1);
      }
    }

    // Filtru pentru locație
    const matchFilter: any = {
      createdAt: { $gte: startDate, $lte: endDate }
    };
    
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      matchFilter.location = req.user?.location;
    }

    // Obține datele pentru export
    const orders = await Order.find(matchFilter)
      .select('orderNumber customer items totalAmount status createdAt location')
      .lean();

    // Generează CSV
    const csvHeaders = [
      'Numar Comanda',
      'Data Crearii',
      'Nume Client', 
      'Telefon Client',
      'Email Client',
      'Numar Articole',
      'Suma Totala',
      'Status',
      'Locatie'
    ];

    const csvRows = orders.map(order => [
      order.orderNumber,
      new Date(order.createdAt).toLocaleDateString('ro-RO'),
      order.customer.name,
      order.customer.phone,
      order.customer.email || '',
      order.totalItems || order.items.length,
      order.totalAmount.toFixed(2),
      order.status,
      order.location
    ]);

    // Construiește CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Setează headers pentru download
    const fileName = `raport-dashboard-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Adaugă BOM pentru UTF-8 (pentru Excel)
    res.write('\uFEFF');
    res.write(csvContent);
    res.end();

    logger.info('Dashboard CSV exported', {
      userId: req.user?.id,
      period,
      ordersCount: orders.length,
      fileName
    });

  } catch (error) {
    logger.error('Eroare la exportul CSV dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la exportul CSV',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

/**
 * Exportă raportul dashboard în format JSON (pentru debugging)
 */
export const exportDashboardJSON = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { period = 'month', startDate: queryStartDate, endDate: queryEndDate } = req.query;

    // Determină perioada
    let startDate: Date;
    let endDate: Date;

    if (queryStartDate && queryEndDate) {
      startDate = new Date(queryStartDate as string);
      endDate = new Date(queryEndDate as string);
    } else {
      const now = new Date();
      endDate = now;
      startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(now.getMonth() - 1);
      }
    }

    // Filtru pentru locație
    const matchFilter: any = {
      createdAt: { $gte: startDate, $lte: endDate }
    };
    
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      matchFilter.location = req.user?.location;
    }

    // Execută toate query-urile pentru raport
    const [
      ordersInPeriod,
      ordersByStatus,
      ordersByDay,
      topServices,
      topCustomers
    ] = await Promise.all([
      // Comenzi în perioada
      Order.find(matchFilter).lean(),
      
      // Comenzi pe status
      Order.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        }
      ]),
      
      // Comenzi pe zile
      Order.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      
      // Top servicii
      Order.aggregate([
        { $match: matchFilter },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              serviceCode: '$items.serviceCode',
              serviceName: '$items.serviceName'
            },
            count: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.totalPrice' }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 }
      ]),
      
      // Top clienți
      Order.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: {
              name: '$customer.name',
              phone: '$customer.phone'
            },
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
            items: { $sum: '$totalItems' }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Calculează statisticile
    const totalOrders = ordersInPeriod.length;
    const totalRevenue = ordersInPeriod.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalItems = ordersInPeriod.reduce((sum, order) => sum + (order.totalItems || order.items.length), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const report = {
      metadata: {
        exportDate: new Date().toISOString(),
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          label: period
        },
        filters: {
          location: req.user?.role !== 'admin' && req.user?.role !== 'super_admin' ? req.user?.location : 'all'
        }
      },
      summary: {
        totalOrders,
        totalRevenue,
        totalItems,
        avgOrderValue
      },
      ordersByStatus,
      ordersByDay,
      topServices: topServices.map(service => ({
        serviceCode: service._id.serviceCode,
        serviceName: service._id.serviceName,
        count: service.count,
        revenue: service.revenue
      })),
      topCustomers: topCustomers.map(customer => ({
        name: customer._id.name,
        phone: customer._id.phone,
        orders: customer.orders,
        revenue: customer.revenue,
        items: customer.items
      })),
      rawData: ordersInPeriod
    };

    // Setează headers pentru download
    const fileName = `raport-dashboard-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache');

    res.json(report);

    logger.info('Dashboard JSON exported', {
      userId: req.user?.id,
      period,
     
      fileName
    });

  } catch (error) {
    logger.error('Eroare la exportul JSON dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la exportul JSON',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

/**
 * Endpoint principal pentru export - determină formatul și rutează
 */
export const exportDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { format = 'csv' } = req.query;

    switch (format) {
      case 'csv':
        await exportDashboardCSV(req, res);
        break;
      case 'json':
        await exportDashboardJSON(req, res);
        break;
      case 'pdf':
        // Pentru viitor - implementare PDF
        res.status(501).json({
          success: false,
          message: 'Export PDF nu este încă implementat. Folosește CSV sau JSON.',
          availableFormats: ['csv', 'json']
        } as ApiResponse);
        break;
      default:
        res.status(400).json({
          success: false,
          message: 'Format de export invalid',
          availableFormats: ['csv', 'json'],
          requestedFormat: format
        } as ApiResponse);
    }

  } catch (error) {
    logger.error('Eroare la exportul dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la export',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};