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
      console.log('Starting generateInvoicePDF with order:', JSON.stringify(order, null, 2));

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      const fileName = `Factura_${order.orderNumber}_${Date.now()}.pdf`;
      const filePath = path.join(config.upload.path, 'temp', fileName);

      console.log('Generated file path:', filePath);

      const tempDir = path.join(config.upload.path, 'temp');
      console.log('Checking temp directory:', tempDir);
      if (!fs.existsSync(tempDir)) {
        console.log('Creating temp directory:', tempDir);
        fs.mkdirSync(tempDir, { recursive: true });
      } else {
        console.log('Temp directory already exists');
      }

      const stream = fs.createWriteStream(filePath);
      console.log('Created write stream for file:', filePath);
      doc.pipe(stream);

      const primaryColor = '#1c294a';
      const accentColor = '#3494db';
      const textColor = '#000000'; // Changed to black for all non-header text
      const lightGray = '#f5f5f5';
      const borderColor = '#cccccc';

      console.log('Registering fonts');
      try {
        const robotoRegularPath = path.join(__dirname, 'fonts', 'Roboto-Regular.ttf');
        const robotoBoldPath = path.join(__dirname, 'fonts', 'Roboto-Bold.ttf');
        console.log('Roboto Regular path:', robotoRegularPath);
        console.log('Roboto Bold path:', robotoBoldPath);

        if (!fs.existsSync(robotoRegularPath)) {
          console.error('Roboto Regular font file does not exist at:', robotoRegularPath);
          throw new Error(`Font file missing: ${robotoRegularPath}`);
        }
        if (!fs.existsSync(robotoBoldPath)) {
          console.error('Roboto Bold font file does not exist at:', robotoBoldPath);
          throw new Error(`Font file missing: ${robotoBoldPath}`);
        }

        doc.registerFont('Roboto', robotoRegularPath);
        doc.registerFont('Roboto-Bold', robotoBoldPath);
        console.log('Fonts registered successfully');
        doc.font('Roboto');
      } catch (fontError) {
        console.error('Error registering fonts:', fontError);
        throw fontError;
      }

      console.log('Creating header');
      const gradient = doc.linearGradient(0, 0, doc.page.width, 120);
      gradient.stop(0, primaryColor).stop(1, '#263a66');
      doc.rect(0, 0, doc.page.width, 120).fill(gradient);

      console.log('Adding logo placeholder');
      doc.circle(70, 75, 30)
         .lineWidth(2)
         .strokeColor(accentColor)
         .fillColor('white')
         .fillAndStroke()
         .fillColor('white')
         .font('Roboto-Bold')
         .fontSize(10)
         .text('LOGO', 55, 72, { align: 'center', width: 30 });

      console.log('Adding company info');
      doc.fillColor('white') // Header text remains white
         .font('Roboto-Bold')
         .fontSize(22)
         .text('CURĂȚĂTORIE PROFESIONALĂ', 140, 30, { width: doc.page.width - 200 })
         .font('Roboto')
         .fontSize(10)
         .text('CUI: RO12345678 | Reg. Com.: J40/1234/2024', 140, 65, { width: doc.page.width - 200 })
         .text('Str. Curățeniei Nr. 10, București', 140, 80, { width: doc.page.width - 200 })
         .text('Tel: 0722 123 456 | Email: contact@curatarie.ro', 140, 95, { width: doc.page.width - 200 });

      console.log('Adding invoice title');
      doc.fillColor(accentColor)
         .font('Roboto-Bold')
         .fontSize(24)
         .text('FACTURĂ FISCALĂ', doc.page.width - 250, 30, { align: 'right', width: 200 })
         .fontSize(10)
         .fillColor('white')
         .text('Emisă conform OUG nr. 28/1999', doc.page.width - 250, 65, { align: 'right', width: 200 });

      console.log('Adding invoice details');
      doc.roundedRect(40, 150, doc.page.width - 80, 80, 10)
         .fillOpacity(0.1)
         .fill(lightGray);

      doc.fillColor(textColor) // Switch to black for non-header text
         .font('Roboto')
         .fontSize(11)
         .text(`Seria: CRT`, 60, 170)
         .text(`Număr: ${order.orderNumber}`, 60, 185)
         .text(`Data: ${new Date().toLocaleDateString('ro-RO')}`, 60, 200);

      console.log('Adding client info');
      doc.roundedRect(40, 250, doc.page.width - 80, order.customer.email ? 100 : 85, 10)
         .lineWidth(1)
         .strokeColor(borderColor)
         .stroke();

      doc.fillColor(textColor)
         .font('Roboto-Bold')
         .fontSize(14)
         .text('Către:', 60, 270)
         .font('Roboto')
         .fontSize(11)
         .text(`Nume: ${order.customer.name}`, 60, 290)
         .text(`Telefon: ${order.customer.phone}`, 60, 305);

      if (order.customer.email) {
        doc.text(`Email: ${order.customer.email}`, 60, 320);
      }

      console.log('Processing items table');
      const tableTop = order.customer.email ? 360 : 345;
      doc.roundedRect(40, tableTop, doc.page.width - 80, 40, 5)
         .fill(lightGray);

      doc.fillColor(textColor)
         .font('Roboto-Bold')
         .fontSize(11)
         .text('Serviciu', 50, tableTop + 15, { width: 200 })
         .text('Cantitate', 250, tableTop + 15, { width: 100 })
         .text('Preț unitar', 350, tableTop + 15, { width: 100 })
         .text('Total', 450, tableTop + 15, { width: 100 });

      console.log('Grouping items:', JSON.stringify(order.items, null, 2));
      let yPosition = tableTop + 50;
      doc.font('Roboto');

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

      console.log('Grouped items:', JSON.stringify(groupedItems, null, 2));

      Object.values(groupedItems).forEach((item: any, index: number) => {
        const y = yPosition + (index * 25);
        console.log(`Adding item ${index + 1}:`, item);
        if (index % 2 === 0) {
          doc.rect(40, y - 5, doc.page.width - 80, 20).fillOpacity(0.5).fill('#f9f9f9');
        }
        doc.fillColor(textColor)
           .fillOpacity(1)
           .text(item.serviceName, 50, y, { width: 200 })
           .text(item.quantity.toString(), 250, y, { width: 100 })
           .text(`${item.unitPrice.toFixed(2)} LEI`, 350, y, { width: 100 })
           .text(`${item.totalPrice.toFixed(2)} LEI`, 450, y, { width: 100 });
      });

      yPosition += Object.values(groupedItems).length * 25 + 20;
      console.log('Adding total:', order.totalAmount);
      doc.roundedRect(40, yPosition - 10, doc.page.width - 80, 40, 5)
         .fill(lightGray);

      doc.fillColor(accentColor)
         .font('Roboto-Bold')
         .fontSize(14)
         .text('TOTAL:', 350, yPosition + 5, { width: 100 })
         .text(`${order.totalAmount.toFixed(2)} LEI`, 450, yPosition + 5, { width: 100 });

      if (order.notes) {
        yPosition += 60;
        console.log('Adding notes:', order.notes);
        doc.roundedRect(40, yPosition - 10, doc.page.width - 80, 60, 5)
           .lineWidth(1)
           .strokeColor(borderColor)
           .stroke();
        doc.fillColor(textColor)
           .font('Roboto')
           .fontSize(11)
           .text('Observații:', 60, yPosition)
           .text(order.notes, 60, yPosition + 15, { width: doc.page.width - 100 });
      }

      console.log('Adding footer');
      const footerY = doc.page.height - 80;
      doc.rect(0, footerY, doc.page.width, 80).fill(primaryColor);
      doc.fillColor('white')
         .font('Roboto')
         .fontSize(10)
         .text('Vă mulțumim pentru încredere!', 40, footerY + 20, { align: 'center', width: doc.page.width - 80 })
         .fontSize(9)
         .text('Factură generată electronic și este valabilă fără semnătură și ștampilă conform legislației în vigoare.', 40, footerY + 40, { align: 'center', width: doc.page.width - 80 });

      console.log('Adding page border');
      doc.lineWidth(1)
         .strokeColor(accentColor)
         .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
         .stroke();

      console.log('Finalizing PDF document');
      doc.end();

      stream.on('finish', () => {
        console.log('PDF generation completed, resolving with file path:', filePath);
        resolve(filePath);
      });

      stream.on('error', (error) => {
        console.error('Stream error:', error);
        reject(error);
      });

    } catch (error) {
      console.error('Error in generateInvoicePDF:', error);
      reject(error);
    }
  });
};