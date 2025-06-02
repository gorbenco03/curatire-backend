// src/controllers/users/userController.ts
import { Request, Response } from 'express';
import { User, IUserDocument } from '../../models/User';
import { ApiResponse, PaginatedResponse } from '../../types';
import { logger } from '../../utils/logger';
import { isValidEmail, isValidPhone } from '../../utils/helpers';

// Interfață pentru request cu user autentificat
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    location: string;
  };
}

/**
 * Obține lista utilizatorilor cu filtrare și paginare
 */
export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      location,
      status
    } = req.query;

    // Construiește filtrul
    const filter: any = {};

    // Filtrare după căutare (nume, email, telefon)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Filtrare după rol
    if (role && role !== 'all') {
      filter.role = role;
    }

    // Filtrare după locație
    if (location && location !== 'all') {
      filter.location = location;
    }

    // Filtrare după status
    if (status && status !== 'all') {
      filter.isActive = status === 'active';
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Execută query-ul
    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select('-password') // Exclude parola
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalUsers / limitNum);

    res.status(200).json({
      success: true,
      message: 'Utilizatori obținuți cu succes',
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalItems: totalUsers,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    } as PaginatedResponse<IUserDocument>);

  } catch (error) {
    logger.error('Eroare la obținerea utilizatorilor:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea utilizatorilor',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

/**
 * Obține un utilizator după ID
 */
export const getUserById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Utilizatorul nu a fost găsit'
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Utilizator obținut cu succes',
      data: user
    } as ApiResponse);

  } catch (error) {
    logger.error('Eroare la obținerea utilizatorului:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea utilizatorului',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

/**
 * Actualizează un utilizator
 */
export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, location, isActive } = req.body;

    // Găsește utilizatorul
    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Utilizatorul nu a fost găsit'
      } as ApiResponse);
      return;
    }

    // Verifică dacă poate modifica super_admin
    if (user.role === 'super_admin' && req.user?.role !== 'super_admin') {
      res.status(403).json({
        success: false,
        message: 'Nu poți modifica un super administrator'
      } as ApiResponse);
      return;
    }

    // Actualizează câmpurile
    if (name) user.name = name.trim();
    
    if (email && email !== user.email) {
      if (!isValidEmail(email)) {
        res.status(400).json({
          success: false,
          message: 'Format email invalid'
        } as ApiResponse);
        return;
      }

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'Acest email este deja folosit'
        } as ApiResponse);
        return;
      }

      user.email = email.trim().toLowerCase();
    }

    if (phone !== undefined) {
      if (phone && !isValidPhone(phone)) {
        res.status(400).json({
          success: false,
          message: 'Format telefon invalid'
        } as ApiResponse);
        return;
      }
      user.phone = phone?.trim() || undefined;
    }

    if (role && req.user?.role === 'super_admin') {
      user.role = role;
    }

    if (location) {
      user.location = location;
    }

    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    await user.save();

    logger.info(`Utilizator actualizat: ${user.email}`, {
      updatedBy: req.user?.id,
      userId: user._id
    });

    res.status(200).json({
      success: true,
      message: 'Utilizator actualizat cu succes',
      data: user.toSafeObject()
    } as ApiResponse);

  } catch (error) {
    logger.error('Eroare la actualizarea utilizatorului:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la actualizarea utilizatorului',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

/**
 * Șterge un utilizator
 */
export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Utilizatorul nu a fost găsit'
      } as ApiResponse);
      return;
    }

    // Nu permite ștergerea super_admin
    if (user.role === 'super_admin') {
      res.status(403).json({
        success: false,
        message: 'Nu poți șterge un super administrator'
      } as ApiResponse);
      return;
    }

    // Nu permite auto-ștergerea
    if (user._id.toString() === req.user?.id) {
      res.status(403).json({
        success: false,
        message: 'Nu te poți șterge pe tine însuți'
      } as ApiResponse);
      return;
    }

    await user.deleteOne();

    logger.info(`Utilizator șters: ${user.email}`, {
      deletedBy: req.user?.id,
      userId: user._id
    });

    res.status(200).json({
      success: true,
      message: 'Utilizator șters cu succes'
    } as ApiResponse);

  } catch (error) {
    logger.error('Eroare la ștergerea utilizatorului:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la ștergerea utilizatorului',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

/**
 * Comută statusul activ/inactiv al unui utilizator
 */
export const toggleUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Utilizatorul nu a fost găsit'
      } as ApiResponse);
      return;
    }

    // Nu permite dezactivarea propriului cont
    if (user._id.toString() === req.user?.id) {
      res.status(403).json({
        success: false,
        message: 'Nu îți poți dezactiva propriul cont'
      } as ApiResponse);
      return;
    }

    // Toggle status
    user.isActive = !user.isActive;
    await user.save();

    logger.info(`Status utilizator schimbat: ${user.email} - ${user.isActive ? 'activ' : 'inactiv'}`, {
      changedBy: req.user?.id,
      userId: user._id
    });

    res.status(200).json({
      success: true,
      message: `Utilizator ${user.isActive ? 'activat' : 'dezactivat'} cu succes`,
      data: user.toSafeObject()
    } as ApiResponse);

  } catch (error) {
    logger.error('Eroare la schimbarea statusului utilizatorului:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la schimbarea statusului',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

/**
 * Resetează parola unui utilizator (trimite parolă nouă)
 */
export const resetUserPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Parola trebuie să aibă cel puțin 6 caractere'
      } as ApiResponse);
      return;
    }

    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Utilizatorul nu a fost găsit'
      } as ApiResponse);
      return;
    }

    // Actualizează parola
    user.password = newPassword;
    await user.save();

    logger.info(`Parolă resetată pentru: ${user.email}`, {
      resetBy: req.user?.id,
      userId: user._id
    });

    res.status(200).json({
      success: true,
      message: 'Parola a fost resetată cu succes'
    } as ApiResponse);

  } catch (error) {
    logger.error('Eroare la resetarea parolei:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la resetarea parolei',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

/**
 * Obține statistici despre utilizatori
 */
export const getUserStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      activeUsers,
      usersByRole,
      usersByLocation
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]),
      User.aggregate([
        {
          $group: {
            _id: '$location',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const stats = {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      byRole: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      byLocation: usersByLocation.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>)
    };

    res.status(200).json({
      success: true,
      message: 'Statistici utilizatori obținute cu succes',
      data: stats
    } as ApiResponse);

  } catch (error) {
    logger.error('Eroare la obținerea statisticilor:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea statisticilor',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};