// src/utils/helpers.ts
import crypto from 'crypto';

// Generează ID unic pentru comandă
export const generateOrderId = (): string => {
  return `ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
};

// Generează ID unic pentru articol
export const generateItemId = (): string => {
  return `item_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
};

// Formatează numărul de telefon
export const formatPhoneNumber = (phone: string): string => {
  // Elimină toate caracterele non-numerice
  const cleaned = phone.replace(/\D/g, '');
  
  // Formatează în format românesc
  if (cleaned.startsWith('4')) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith('0')) {
    return `+4${cleaned.substring(1)}`;
  } else {
    return `+4${cleaned}`;
  }
};

// Validează formatul email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validează formatul telefon românesc
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+4|4|0)\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Calculează hash pentru parole
export const generateHash = (text: string): string => {
  return crypto.createHash('sha256').update(text).digest('hex');
};

// Generează token random
export const generateRandomToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

// Formatează moneda
export const formatCurrency = (amount: number, currency: string = 'RON'): string => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Formatează data pentru România
export const formatDate = (date: Date, format: 'short' | 'long' | 'datetime' = 'short'): string => {
  const options: Intl.DateTimeFormatOptions = {};
  
  switch (format) {
    case 'short':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      break;
    case 'long':
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      options.weekday = 'long';
      break;
    case 'datetime':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
  }
  
  return new Intl.DateTimeFormat('ro-RO', options).format(date);
};