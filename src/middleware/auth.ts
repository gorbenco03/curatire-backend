// src/middleware/auth.ts - Versiune temporară pentru testare
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

// Middleware temporar pentru autentificare (pentru testare)
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Token de acces lipsă'
    } as ApiResponse);
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    req.user = decoded;
    console.log('Utilizator decodificat din token:', req.user); // Adaugă acest log
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Token invalid sau expirat'
    } as ApiResponse);
    return;
  }
};

// Middleware pentru verificarea rolurilor
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    console.log('Verificare rol - Utilizator:', req.user, 'Roluri permise:', roles); // Adaugă acest log
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Utilizator neautentificat'
      } as ApiResponse);
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Nu ai permisiunea să accesezi această resursă'
      } as ApiResponse);
      return;
    }

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