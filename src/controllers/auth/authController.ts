
// src/controllers/auth/authController.ts
import { Request, Response } from 'express';
import { User, IUserDocument } from '../../models/User';
import { ApiResponse, LoginRequest, RegisterUserRequest } from '../../types';
import { logger } from '../../utils/logger';
import { isValidEmail, isValidPhone } from '../../utils/helpers';

// Login utilizator
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔐 Încercare de login pentru:', req.body.email);
    
    const { email, password }: LoginRequest = req.body;

    // Validare de bază
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email și parola sunt obligatorii'
      } as ApiResponse);
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({
        success: false,
        message: 'Format email invalid'
      } as ApiResponse);
      return;
    }

    // Caută utilizatorul în baza de date
    const user = await User.findByEmail(email);
    
    if (!user) {
      console.log('❌ Utilizator nu există:', email);
      res.status(401).json({
        success: false,
        message: 'Email sau parolă incorectă'
      } as ApiResponse);
      return;
    }

    // Verifică dacă contul este activ
    if (!user.isActive) {
      console.log('❌ Cont dezactivat:', email);
      res.status(401).json({
        success: false,
        message: 'Contul este dezactivat. Contactează administratorul.'
      } as ApiResponse);
      return;
    }

    // Verifică parola
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      console.log('❌ Parolă incorectă pentru:', email);
      res.status(401).json({
        success: false,
        message: 'Email sau parolă incorectă'
      } as ApiResponse);
      return;
    }

    // Generează token-ul JWT
    const token = user.generateAuthToken();
    
    // Actualizează ultima conectare
    await user.updateLastLogin();

    // Returnează datele utilizatorului și token-ul
    const userData = {
      ...user.toSafeObject(),
      token
    };

    console.log('✅ Login reușit pentru:', email, '- Rol:', user.role);

    logger.info(`Utilizator logat: ${email}`, {
      userId: user._id,
      role: user.role,
      location: user.location
    });

    res.status(200).json({
      success: true,
      message: 'Autentificare reușită',
      data: userData
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Eroare la login:', error);
    logger.error('Eroare la login:', error);
    
    res.status(500).json({
      success: false,
      message: 'Eroare la autentificare',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Înregistrare utilizator nou (doar pentru admin/super_admin)
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('👤 Încercare de înregistrare pentru:', req.body.email);
    
    const { name, email, password, phone, role, location }: RegisterUserRequest = req.body;

    // Validare de bază
    if (!name || !email || !password || !role || !location) {
      res.status(400).json({
        success: false,
        message: 'Toate câmpurile obligatorii trebuie completate'
      } as ApiResponse);
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({
        success: false,
        message: 'Format email invalid'
      } as ApiResponse);
      return;
    }

    if (phone && !isValidPhone(phone)) {
      res.status(400).json({
        success: false,
        message: 'Format telefon invalid'
      } as ApiResponse);
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Parola trebuie să aibă cel puțin 6 caractere'
      } as ApiResponse);
      return;
    }

    // Verifică dacă email-ul există deja
    const existingUser = await User.findByEmail(email);
    
    if (existingUser) {
      console.log('❌ Email deja folosit:', email);
      res.status(400).json({
        success: false,
        message: 'Acest email este deja înregistrat'
      } as ApiResponse);
      return;
    }

    // Creează utilizatorul nou
    const newUser = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone?.trim(),
      role,
      location: location.trim(),
      isActive: true
    });

    // Salvează în baza de date
    const savedUser = await newUser.save();

    console.log('✅ Utilizator creat cu succes:', email, '- Rol:', role);

    logger.info(`Utilizator nou creat: ${email}`, {
      userId: savedUser._id,
      role: savedUser.role,
      location: savedUser.location
    });

    res.status(201).json({
      success: true,
      message: 'Utilizator creat cu succes',
      data: savedUser.toSafeObject()
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Eroare la înregistrare:', error);
    
    // Erori specifice Mongoose
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        message: 'Date de intrare invalide',
        error: error.message
      } as ApiResponse);
      return;
    }

    logger.error('Eroare la înregistrare:', error);
    
    res.status(500).json({
      success: false,
      message: 'Eroare la crearea utilizatorului',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Obține profilul utilizatorului curent
export const getCurrentUser = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Utilizator neautentificat'
      } as ApiResponse);
      return;
    }

    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Utilizatorul nu a fost găsit'
      } as ApiResponse);
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Contul este dezactivat'
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profil utilizator obținut cu succes',
      data: user.toSafeObject()
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Eroare la obținerea profilului:', error);
    logger.error('Eroare la obținerea profilului:', error);
    
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea profilului',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Actualizează profilul utilizatorului
export const updateProfile = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, phone, email } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Utilizator neautentificat'
      } as ApiResponse);
      return;
    }

    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Utilizatorul nu a fost găsit'
      } as ApiResponse);
      return;
    }

    // Actualizează doar câmpurile permise
    if (name) user.name = name.trim();
    if (phone) {
      if (!isValidPhone(phone)) {
        res.status(400).json({
          success: false,
          message: 'Format telefon invalid'
        } as ApiResponse);
        return;
      }
      user.phone = phone.trim();
    }
    
    // Email-ul poate fi schimbat doar dacă nu există deja
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

    await user.save();

    logger.info(`Profil actualizat: ${user.email}`, {
      userId: user._id
    });

    res.status(200).json({
      success: true,
      message: 'Profil actualizat cu succes',
      data: user.toSafeObject()
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Eroare la actualizarea profilului:', error);
    logger.error('Eroare la actualizarea profilului:', error);
    
    res.status(500).json({
      success: false,
      message: 'Eroare la actualizarea profilului',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};

// Schimbă parola
export const changePassword = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Utilizator neautentificat'
      } as ApiResponse);
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Parola curentă și noua parolă sunt obligatorii'
      } as ApiResponse);
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Noua parolă trebuie să aibă cel puțin 6 caractere'
      } as ApiResponse);
      return;
    }

    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Utilizatorul nu a fost găsit'
      } as ApiResponse);
      return;
    }

    // Verifică parola curentă
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        message: 'Parola curentă este incorectă'
      } as ApiResponse);
      return;
    }

    // Actualizează parola
    user.password = newPassword;
    await user.save();

    logger.info(`Parolă schimbată: ${user.email}`, {
      userId: user._id
    });

    res.status(200).json({
      success: true,
      message: 'Parola a fost schimbată cu succes'
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Eroare la schimbarea parolei:', error);
    logger.error('Eroare la schimbarea parolei:', error);
    
    res.status(500).json({
      success: false,
      message: 'Eroare la schimbarea parolei',
      error: error instanceof Error ? error.message : 'Eroare necunoscută'
    } as ApiResponse);
  }
};