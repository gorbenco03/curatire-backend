// src/controllers/dashboard/dashboardController.ts
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

// Interfața pentru statistici dashboard
interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalItems: number;
  completedOrders: number;
  avgOrderValue: number;
  completionRate: number;
  pendingOrders: number;
  readyOrders: number;
  inProgressOrders: number;
}

// Interfața pentru statistici zilnice
interface DailyStats {
  date: string;
  orders: number;
  revenue: number;
  items: number;
}

// Interfața pentru servicii populare
interface PopularService {
  serviceCode: string;
  serviceName: string;
  count: number;
  revenue: number;
  percentage: number;
}

// Interfața pentru comenzi care necesită atenție
interface OrderNeedingAttention {
  _id: string;
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
  };
  status: string;
  createdAt: Date;
  updatedAt: Date;
  daysInProgress: number;
  type: 'delayed' | 'ready' | 'urgent';
  message: string;
}

/**
 * Obține statisticile principale pentru dashboard
 */
export const getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { period = 'week' } = req.query;
    
    // Calculează data de început pe baza perioadei
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(now.toDateString());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
    }

    // Filtru pentru locație (dacă nu e admin)
    const locationFilter: any = {};
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      locationFilter.location = req.user?.location;
    }

    // Query pentru comenzi în perioada selectată
    const ordersQuery = {
      ...locationFilter,
      createdAt: { $gte: startDate, $lte: now }
    };

    // Execută toate query-urile în paralel
    const [
      totalOrdersResult,
      ordersInPeriod,
      ordersByStatus
    ] = await Promise.all([
      // Total comenzi (toată perioada)
      Order.countDocuments(locationFilter),
      
      // Comenzi în perioada selectată
      Order.find(ordersQuery).lean(),
      
      // Comenzi pe status-uri
      Order.aggregate([
        { $match: locationFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Calculează statisticile
    const totalOrders = ordersInPeriod.length;
    const totalRevenue = ordersInPeriod.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalItems = ordersInPeriod.reduce((sum, order) => sum + order.totalItems, 0);
    const completedOrders = ordersInPeriod.filter(order => order.status === 'completed').length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    // Statusuri
    const statusCounts = ordersByStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    const stats: DashboardStats = {
      totalOrders,
      totalRevenue,
      totalItems,
      completedOrders,
      avgOrderValue,
      completionRate,
      pendingOrders: statusCounts.pending || 0,
      readyOrders: statusCounts.ready || 0,
      inProgressOrders: statusCounts.in_progress || 0
    };

    logger.info('Dashboard stats retrieved', {
      userId: req.user?.id,
      period,
      statsGenerated: Object.keys(stats).length
    });

    res.status(200).json({
      success: true,
      message: 'Statistici dashboard obținute cu succes',
      data: stats
    } as ApiResponse);

  } catch (error) {
    logger.error('Eroare la obținerea statisticilor dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea statisticilor',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

/**
 * Obține statisticile zilnice pentru grafic
 */
export const getDailyStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { days = 7 } = req.query;
    const daysCount = Math.min(parseInt(days as string), 30); // Maxim 30 de zile

    // Filtru pentru locație
    const locationFilter: any = {};
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      locationFilter.location = req.user?.location;
    }

    // Calculează datele pentru ultimele X zile
    const dailyStats: DailyStats[] = [];
    
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.toDateString());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayOrders = await Order.find({
        ...locationFilter,
        createdAt: {
          $gte: dayStart,
          $lt: dayEnd
        }
      }).lean();

      const dayRevenue = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const dayItems = dayOrders.reduce((sum, order) => sum + order.totalItems, 0);

      dailyStats.push({
        date: dayStart.toISOString().split('T')[0], // YYYY-MM-DD
        orders: dayOrders.length,
        revenue: dayRevenue,
        items: dayItems
      });
    }

    res.status(200).json({
      success: true,
      message: 'Statistici zilnice obținute cu succes',
      data: dailyStats
    } as ApiResponse);

  } catch (error) {
    logger.error('Eroare la obținerea statisticilor zilnice:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea statisticilor zilnice',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

/**
 * Obține serviciile populare
 */
export const getPopularServices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { limit = 10, period = 'month' } = req.query;
    
    // Calculează data de început
    const now = new Date();
    let startDate = new Date();
    
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

    // Filtru pentru locație
    const matchFilter: any = {
      createdAt: { $gte: startDate, $lte: now }
    };
    
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      matchFilter.location = req.user?.location;
    }

    // Agregare pentru servicii populare
    const popularServices = await Order.aggregate([
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
      { $limit: parseInt(limit as string) }
    ]);

    // Calculează totalul pentru percentaje
    const totalRevenue = popularServices.reduce((sum, service) => sum + service.revenue, 0);

    // Formatează rezultatele
    const formattedServices: PopularService[] = popularServices.map(service => ({
      serviceCode: service._id.serviceCode,
      serviceName: service._id.serviceName,
      count: service.count,
      revenue: service.revenue,
      percentage: totalRevenue > 0 ? (service.revenue / totalRevenue) * 100 : 0
    }));

    res.status(200).json({
      success: true,
      message: 'Servicii populare obținute cu succes',
      data: formattedServices
    } as ApiResponse);

  } catch (error) {
    logger.error('Eroare la obținerea serviciilor populare:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea serviciilor populare',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

/**
 * Obține comenzile care necesită atenție
 */
export const getOrdersNeedingAttention = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // Filtru pentru locație
    const locationFilter: any = {};
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      locationFilter.location = req.user?.location;
    }

    // Query pentru comenzi care necesită atenție
    const ordersQuery = {
      ...locationFilter,
      $or: [
        // Comenzi în procesare de peste 3 zile
        {
          status: 'in_progress',
          updatedAt: { $lte: threeDaysAgo }
        },
        // Comenzi gata de ridicat
        {
          status: 'ready'
        },
        // Comenzi pending de peste 1 zi
        {
          status: 'pending',
          createdAt: { $lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        }
      ]
    };

    const orders = await Order.find(ordersQuery)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Formatează comenzile cu informații suplimentare
    const ordersNeedingAttention: OrderNeedingAttention[] = orders.map(order => {
      const daysSinceCreated = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceUpdated = Math.floor((now.getTime() - new Date(order.updatedAt).getTime()) / (1000 * 60 * 60 * 24));

      let type: 'delayed' | 'ready' | 'urgent';
      let message: string;

      if (order.status === 'ready') {
        type = 'ready';
        message = 'Gată pentru ridicare';
      } else if (order.status === 'in_progress' && daysSinceUpdated >= 3) {
        type = 'delayed';
        message = `În procesare de ${daysSinceUpdated} zile`;
      } else if (order.status === 'pending' && daysSinceCreated >= 1) {
        type = 'urgent';
        message = `Pending de ${daysSinceCreated} zile`;
      } else {
        type = 'urgent';
        message = 'Necesită verificare';
      }

      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: {
          name: order.customer.name,
          phone: order.customer.phone
        },
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        daysInProgress: Math.max(daysSinceCreated, daysSinceUpdated),
        type,
        message
      };
    });

    res.status(200).json({
      success: true,
      message: 'Comenzi care necesită atenție obținute cu succes',
      data: ordersNeedingAttention
    } as ApiResponse);

  } catch (error) {
    logger.error('Eroare la obținerea comenzilor care necesită atenție:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea comenzilor',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

/**
 * Obține raport complet pentru o perioadă
 */
export const getDashboardReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { 
      period = 'month',
      startDate: queryStartDate,
      endDate: queryEndDate 
    } = req.query;

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
    const totalItems = ordersInPeriod.reduce((sum, order) => sum + order.totalItems, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const report = {
      period: {
        startDate,
        endDate,
        label: period
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
      }))
    };

    res.status(200).json({
      success: true,
      message: 'Raport dashboard generat cu succes',
      data: report
    } as ApiResponse);

  } catch (error) {
    logger.error('Eroare la generarea raportului dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la generarea raportului',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};