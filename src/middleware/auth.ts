// src/middleware/auth.ts - Versiune corectată
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';
import { ApiResponse } from '../types';

// Interfață pentru request cu user autentificat
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    location: string;
    name: string;
  };
}

// Middleware pentru autentificare
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔐 Auth Header:', authHeader ? 'Present' : 'Missing');
    console.log('🔑 Token:', token ? `${token.substring(0, 20)}...` : 'Missing');

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token de acces lipsă'
      } as ApiResponse);
      return;
    }

    // Verifică token-ul
    jwt.verify(token, config.jwt.secret, (err, decoded) => {
      if (err) {
        console.error('❌ Token verification error:', err.message);
        res.status(403).json({
          success: false,
          message: 'Token invalid sau expirat'
        } as ApiResponse);
        return;
      }

      // Token valid - adaugă user în request
      req.user = decoded as any;
      console.log('✅ User authenticated:', {
        id: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        location: req.user?.location
      });
      
      next();
    });
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la autentificare'
    } as ApiResponse);
  }
};

// Middleware pentru verificarea rolurilor
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    console.log('🛡️ Checking roles:', {
      requiredRoles: roles,
      userRole: req.user?.role,
      hasRole: req.user ? roles.includes(req.user.role) : false
    });

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Utilizator neautentificat'
      } as ApiResponse);
      return;
    }

    if (!roles.includes(req.user.role)) {
      console.error('❌ Role check failed:', {
        userRole: req.user.role,
        requiredRoles: roles
      });
      
      res.status(403).json({
        success: false,
        message: 'Nu ai permisiunea să accesezi această resursă'
      } as ApiResponse);
      return;
    }

    console.log('✅ Role check passed');
    next();
  };
};

// Middleware pentru verificarea locației (pentru utilizatori non-admin)
export const requireSameLocation = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Utilizator neautentificat'
    } as ApiResponse);
    return;
  }

  // Admin și super_admin pot accesa toate locațiile
  if (req.user.role === 'admin' || req.user.role === 'super_admin') {
    next();
    return;
  }

  // Pentru alți utilizatori, verifică locația
  // Această logică va fi implementată în fiecare controller specific
  next();
};