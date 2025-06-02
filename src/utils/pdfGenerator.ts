// src/utils/pdfGenerator.ts
import PDFDocument from 'pdfkit';

import fs from 'fs';
import path from 'path';
import { IOrderDocument } from '../models/Order';
import { config } from '../config/config';

// Generează PDF cu QR-uri (un QR pe pagină)
export const generateOrderPDF = async (order: IOrderDocument): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      const fileName = `QR_${order.orderNumber}_${Date.now()}.pdf`;
      const filePath = path.join(config.upload.path, 'temp', fileName);

      // Asigură că directorul există
      const tempDir = path.join(config.upload.path, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Pipe PDF to file
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Pentru fiecare articol, creează o pagină nouă
      order.items.forEach((item, index) => {
        if (index > 0) {
          doc.addPage();
        }
// QR Code în centru
if (item.qrCodePath) {
  const qrPath = path.join(config.upload.path, item.qrCodePath);
  if (fs.existsSync(qrPath)) {
    const qrYPosition = doc.y; // Salvează poziția curentă y
    doc.image(qrPath, doc.page.width / 2 - 100, qrYPosition, {
      width: 200,
      height: 200
    });
    doc.y = qrYPosition + 220; // Adaugă 220 de unități (200 înălțime QR + 20 spațiu suplimentar)
  }
}

// Cod unic articol
doc.fontSize(16)
   .font('Helvetica-Bold')
   .text(`COD ARTICOL: ${item.itemCode.toString().toUpperCase()}`, { align: 'center' })
   .moveDown();
        // Detalii articol
        doc.fontSize(12)
           .font('Helvetica');

        // Box pentru informații
       
        doc.x = 50; // Reset x position

      
       
      });

      // Finalizează PDF-ul
      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', reject);

    } catch (error) {
      reject(error);
    }
  });
};

// Generează factură PDF
export const generateInvoicePDF = async (order: IOrderDocument): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      console.log('🎨 Generare factura moderna pentru comanda:', order.orderNumber);

      const doc = new PDFDocument({
        size: 'A4',
        margin: 0, // Zero margin pentru control total
        bufferPages: true
      });

      const fileName = `Factura_${order.orderNumber}_${Date.now()}.pdf`;
      const filePath = path.join(config.upload.path, 'temp', fileName);

      // Asigura-te ca directorul temp exista
      const tempDir = path.join(config.upload.path, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Paleta de culori moderna
      const colors = {
        primary: '#2563eb',      // Blue
        secondary: '#1e40af',    // Darker blue
        accent: '#3b82f6',       // Light blue
        success: '#10b981',      // Green
        dark: '#1f2937',         // Dark gray
        medium: '#6b7280',       // Medium gray
        light: '#f3f4f6',        // Light gray
        white: '#ffffff',
        border: '#e5e7eb',
        background: '#f8fafc'
      };

      // Dimensiuni si pozitii
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2);

      // Inregistrare fonturi (fallback la fonturi standard daca nu gaseste custom)
      try {
        const robotoRegularPath = path.join(__dirname, 'fonts', 'Roboto-Regular.ttf');
        const robotoBoldPath = path.join(__dirname, 'fonts', 'Roboto-Bold.ttf');
        
        if (fs.existsSync(robotoRegularPath) && fs.existsSync(robotoBoldPath)) {
          doc.registerFont('Roboto', robotoRegularPath);
          doc.registerFont('Roboto-Bold', robotoBoldPath);
          doc.font('Roboto');
        } else {
          // Fallback la fonturi standard
          doc.font('Helvetica');
        }
      } catch (fontError) {
        console.log('📝 Folosesc fonturi standard (Helvetica)');
        doc.font('Helvetica');
      }

      // === HEADER SECTION ===
      console.log('🎨 Creez header-ul...');
      
      // Background gradient pentru header
      const gradient = doc.linearGradient(0, 0, pageWidth, 140);
      gradient.stop(0, colors.primary).stop(0.7, colors.secondary).stop(1, colors.dark);
      doc.rect(0, 0, pageWidth, 140).fill(gradient);

      // Geometric shapes pentru design modern
      doc.circle(pageWidth - 80, -20, 60).fillOpacity(0.1).fill(colors.white);
      doc.circle(pageWidth - 20, 40, 40).fillOpacity(0.1).fill(colors.white);
      doc.rect(-20, 80, 100, 100).fillOpacity(0.05).fill(colors.white);

      // Logo placeholder modern
      doc.fillOpacity(1)
         .roundedRect(margin, 25, 80, 80, 15)
         .fillAndStroke(colors.white, colors.accent);

      // Logo text
      doc.fillColor(colors.primary)
         .font('Helvetica-Bold')
         .fontSize(12)
         .text('CLEAN', margin + 15, 55)
         .fontSize(8)
         .text('TECH', margin + 15, 75);

      // Company info - elegant typography
      doc.fillColor(colors.white)
         .font('Helvetica-Bold')
         .fontSize(24)
         .text('CURATARE PROFESIONALA', margin + 110, 30);

      doc.font('Helvetica')
         .fontSize(11)
         .fillOpacity(0.9)
         .text('Servicii premium de curatare si intretinere', margin + 110, 58)
         .fontSize(9)
         .fillOpacity(0.8)
         .text('Str. Curateniei Nr. 10, Bucuresti', margin + 110, 80)
         .text('Tel: 0722 123 456  Email: contact@curatarie.ro', margin + 110, 95)
         .text('Web: www.curatarie-profesionala.ro', margin + 110, 110);

      // === INVOICE TITLE SECTION ===
      let yPos = 170;
      
      // Modern invoice number badge
      doc.fillOpacity(1)
         .roundedRect(pageWidth - 220, yPos - 10, 180, 50, 8)
         .fill(colors.light);

      doc.fillColor(colors.dark)
         .font('Helvetica-Bold')
         .fontSize(20)
         .text('FACTURA', pageWidth - 210, yPos)
         .fontSize(12)
         .fillColor(colors.medium)
         .text(`#${order.orderNumber}`, pageWidth - 210, yPos + 25);

      // Date si informatii
      doc.fillColor(colors.dark)
         .font('Helvetica')
         .fontSize(10)
         .text(`Data emiterii: ${new Date().toLocaleDateString('ro-RO', { 
           year: 'numeric', 
           month: 'long', 
           day: 'numeric' 
         })}`, margin, yPos + 10)
         .text(`Serie: CRT-2024`, margin, yPos + 25)
         .text(`CUI: RO12345678`, margin, yPos + 40);

      yPos += 80;

      // === CLIENT SECTION ===
      console.log('👤 Adaug informatii client...');
      
      // Client header
      doc.fillColor(colors.primary)
         .font('Helvetica-Bold')
         .fontSize(14)
         .text('FACTURAT CATRE', margin, yPos);

      yPos += 25;

      // Client card cu shadow effect
      doc.fillOpacity(0.05)
         .roundedRect(margin - 2, yPos + 2, contentWidth, order.customer.email ? 85 : 70, 12)
         .fill(colors.dark); // Shadow

      doc.fillOpacity(1)
         .roundedRect(margin, yPos, contentWidth, order.customer.email ? 85 : 70, 12)
         .fill(colors.white)
         .stroke(colors.border);

      // Client icon
      doc.circle(margin + 25, yPos + 35, 15)
         .fill(colors.light);

      doc.fillColor(colors.primary)
         .font('Helvetica-Bold')
         .fontSize(12)
         .text('C', margin + 20, yPos + 30);

      // Client info
      doc.fillColor(colors.dark)
         .font('Helvetica-Bold')
         .fontSize(13)
         .text(order.customer.name, margin + 55, yPos + 20);

      doc.font('Helvetica')
         .fontSize(11)
         .fillColor(colors.medium)
         .text(`Telefon: ${order.customer.phone}`, margin + 55, yPos + 40);

      if (order.customer.email) {
        doc.text(`Email: ${order.customer.email}`, margin + 55, yPos + 55);
      }

      yPos += (order.customer.email ? 85 : 70) + 30;

      // === ITEMS TABLE ===
      console.log('📋 Creez tabelul cu servicii...');

      // Table header
      const tableHeaderHeight = 45;
      
      // Gradient pentru header tabel
      const tableGradient = doc.linearGradient(margin, yPos, margin + contentWidth, yPos + tableHeaderHeight);
      tableGradient.stop(0, colors.primary).stop(1, colors.secondary);
      
      doc.roundedRect(margin, yPos, contentWidth, tableHeaderHeight, 8)
         .fill(tableGradient);

      // Header text
      doc.fillColor(colors.white)
         .font('Helvetica-Bold')
         .fontSize(12)
         .text('SERVICIU', margin + 20, yPos + 16)
         .text('CANT.', margin + 280, yPos + 16)
         .text('PRET UNITAR', margin + 340, yPos + 16)
         .text('TOTAL', margin + 450, yPos + 16);

      yPos += tableHeaderHeight;

      // Group items
      const groupedItems = order.items.reduce((acc, item) => {
        const key = `${item.serviceCode}_${item.unitPrice}`;
        if (!acc[key]) {
          acc[key] = {
            serviceName: item.serviceName,
            serviceCode: item.serviceCode,
            quantity: 0,
            unitPrice: item.unitPrice,
            totalPrice: 0,
          };
        }
        acc[key].quantity += item.quantity;
        acc[key].totalPrice += item.totalPrice;
        return acc;
      }, {} as Record<string, any>);

      // Table rows
      Object.values(groupedItems).forEach((item: any, index: number) => {
        const rowHeight = 35;
        const isEven = index % 2 === 0;
        
        // Alternating row colors
        if (isEven) {
          doc.rect(margin, yPos, contentWidth, rowHeight)
             .fillOpacity(0.02)
             .fill(colors.primary);
        }

        // Service icon
        doc.fillOpacity(1)
           .circle(margin + 15, yPos + 17, 8)
           .fill(colors.light);

        doc.fillColor(colors.accent)
           .font('Helvetica-Bold')
           .fontSize(8)
           .text('S', margin + 12, yPos + 14);

        // Row content
        doc.fillColor(colors.dark)
           .font('Helvetica')
           .fontSize(10)
           .text(item.serviceName, margin + 35, yPos + 12, { width: 220 });

        doc.font('Helvetica-Bold')
           .fontSize(11)
           .text(item.quantity.toString(), margin + 285, yPos + 12)
           .text(`${item.unitPrice.toFixed(2)} LEI`, margin + 345, yPos + 12)
           .text(`${item.totalPrice.toFixed(2)} LEI`, margin + 455, yPos + 12);

        yPos += rowHeight;
      });

      // Table bottom border
      doc.moveTo(margin, yPos)
         .lineTo(margin + contentWidth, yPos)
         .stroke(colors.border);

      yPos += 20;

      // === TOTAL SECTION ===
      console.log('💰 Adaug totalul...');
      
      // Total background
      const totalGradient = doc.linearGradient(margin + 250, yPos, margin + contentWidth, yPos + 60);
      totalGradient.stop(0, colors.success).stop(1, '#059669');
      
      doc.roundedRect(margin + 250, yPos, contentWidth - 250, 60, 12)
         .fill(totalGradient);

      // Total text
      doc.fillColor(colors.white)
         .font('Helvetica-Bold')
         .fontSize(16)
         .text('TOTAL DE PLATA', margin + 270, yPos + 15)
         .fontSize(22)
         .text(`${order.totalAmount.toFixed(2)} LEI`, margin + 270, yPos + 35);

      // Total badge
      doc.circle(margin + 500, yPos + 30, 20)
         .fillOpacity(0.2)
         .fill(colors.white);

      doc.fillColor(colors.white)
         .font('Helvetica-Bold')
         .fontSize(16)
         .text('$', margin + 494, yPos + 24);

      yPos += 80;

      // === NOTES SECTION ===
      if (order.notes) {
        console.log('📝 Adaug observatiile...');
        
        doc.fillColor(colors.dark)
           .font('Helvetica-Bold')
           .fontSize(12)
           .text('OBSERVATII', margin, yPos);

        yPos += 20;

        doc.roundedRect(margin, yPos, contentWidth, 60, 8)
           .fill(colors.light)
           .stroke(colors.border);

        

        yPos += 80;
      }

      // === FOOTER SECTION ===
      console.log('🎯 Creez footer-ul...');
      
      const footerY = pageHeight - 120;
      
      // Footer gradient
      const footerGradient = doc.linearGradient(0, footerY, pageWidth, pageHeight);
      footerGradient.stop(0, colors.dark).stop(1, '#111827');
      
      doc.rect(0, footerY, pageWidth, 120).fill(footerGradient);

      // Decorative elements
      doc.circle(pageWidth - 50, footerY + 20, 30).fillOpacity(0.1).fill(colors.white);
      doc.circle(50, footerY + 80, 25).fillOpacity(0.1).fill(colors.white);

      // Footer content
      doc.fillOpacity(1)
         .fillColor(colors.white)
         .font('Helvetica-Bold')
         .fontSize(14)
         .text('Va multumim pentru increderea acordata!', margin, footerY + 25, {
           align: 'center',
           width: contentWidth
         });

      doc.font('Helvetica')
         .fontSize(10)
         .fillOpacity(0.8)
         .text('Aceasta factura a fost generata automat de sistemul nostru si este valabila conform legislatiei in vigoare.', 
               margin, footerY + 50, {
           align: 'center',
           width: contentWidth,
           lineGap: 3
         });

      doc.fontSize(9)
         .fillOpacity(0.6)
         .text(`Generat pe ${new Date().toLocaleString('ro-RO')} | Document electronic validat`, 
               margin, footerY + 80, {
           align: 'center',
           width: contentWidth
         });

      // === DESIGN ELEMENTS ===
      
      // Watermark subtle
      doc.save();
      doc.fillOpacity(0.03)
         .font('Helvetica-Bold')
         .fontSize(60)
         .fillColor(colors.primary);
      // Apply rotation around the center of the watermark
      doc.translate(pageWidth/2, pageHeight/2);
      doc.rotate(-15);
      doc.text('PLATIT', -80, -30, {
        width: 160
      });
      doc.restore();

      // Border accent
      doc.fillOpacity(1)
         .rect(0, 0, 5, pageHeight).fill(colors.primary)
         .rect(pageWidth - 5, 0, 5, pageHeight).fill(colors.primary);

      console.log('✅ Finalizez documentul PDF...');
      doc.end();

      stream.on('finish', () => {
        console.log('🎉 Factura moderna generata cu succes:', filePath);
        resolve(filePath);
      });

      stream.on('error', (error) => {
        console.error('❌ Eroare la generarea PDF:', error);
        reject(error);
      });

    } catch (error) {
      console.error('💥 Eroare in generateInvoicePDF:', error);
      reject(error);
    }
  });
};