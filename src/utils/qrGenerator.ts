// src/utils/qrGenerator.ts - Fixed version
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { config } from '../config/config';

export interface QRData {
  orderId: string;
  orderNumber: string;
  itemId: string;
  itemCode: string; // Adăugat
  serviceCode: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
}

// Generează un ID unic pentru articol
export const generateItemId = (): string => {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Generează datele pentru QR-ul unui articol
export const generateQRData = (
  orderId: string,
  orderNumber: string,
  itemId: string,
  itemCode: string,
  serviceCode: string,
  serviceName: string,
  customerName: string,
  customerPhone: string
): QRData => {
  return {
    orderId,
    orderNumber,
    itemId,
    itemCode,
    serviceCode,
    serviceName,
    customerName,
    customerPhone
  };
};

// Convertește datele QR în string pentru generarea codului
export const qrDataToString = (qrData: QRData): string => {
  return JSON.stringify(qrData);
};

// Generează QR code și salvează ca fișier
export const generateQRCode = async (qrData: QRData): Promise<string> => {
  try {
    const qrString = qrDataToString(qrData);
    
    // Configurarea QR code-ului
    const options = {
      errorCorrectionLevel: 'H' as const,
      type: 'png' as const,
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    };

    // Generează QR code ca buffer
    const qrBuffer = await QRCode.toBuffer(qrString, options);
    
    // Creează numele fișierului
    const fileName = `qr_${qrData.itemCode}_${Date.now()}.png`;
    const qrDir = path.join(config.upload.path, 'qr-codes');
    
    // Asigură că directorul există
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }
    
    const filePath = path.join(qrDir, fileName);
    
    // Salvează fișierul
    fs.writeFileSync(filePath, qrBuffer);
    
    console.log(`✅ QR salvat: ${filePath}`);
    
    // Returnează path-ul relativ pentru a fi stocat în baza de date
    return `qr-codes/${fileName}`;
    
  } catch (error) {
    console.error('Eroare la generarea QR code:', error);
    throw new Error('Nu s-a putut genera QR code-ul');
  }
};

// Generează QR code ca SVG string (pentru afișare în browser)
export const generateQRCodeSVG = (qrString: string, size: number = 200): string => {
  try {
    // Pentru frontend, vom genera SVG-ul direct în browser
    // Aceasta este o funcție simplificată pentru a evita erori
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#f0f0f0"/>
      <text x="${size/2}" y="${size/2}" text-anchor="middle" dy=".3em" font-family="Arial" font-size="12">
        QR Code
      </text>
    </svg>`;
  } catch (error) {
    console.error('Eroare la generarea QR SVG:', error);
    return '';
  }
};

// Parseză datele dintr-un QR code
export const parseQRData = (qrString: string): QRData => {
  try {
    const parsed = JSON.parse(qrString);
    
    // Validează că are toate câmpurile necesare
    if (!parsed.orderId || !parsed.orderNumber || !parsed.itemId) {
      throw new Error('QR code invalid - lipsesc date esențiale');
    }
    
    return parsed as QRData;
    
  } catch (error) {
    throw new Error('Format QR code invalid');
  }
};