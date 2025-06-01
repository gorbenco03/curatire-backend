// src/utils/emailService.ts
import nodemailer from 'nodemailer';
import { config } from '../config/config';
import { IOrderDocument } from '../models/Order';
import fs from 'fs';

// Configurare transporter
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});

// Trimite factura pe email
export const sendInvoiceEmail = async (
  to: string, 
  order: IOrderDocument, 
  invoicePath: string
): Promise<void> => {
  try {
    const mailOptions = {
      from: `"Curățătorie Profesională" <${config.email.from}>`,
      to,
      subject: `Factură comandă ${order.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Curățătorie Profesională</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9fafb;">
            <h2 style="color: #1f2937;">Bună ziua, ${order.customer.name}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Vă mulțumim pentru comanda dumneavoastră. Atașat găsiți factura pentru comanda 
              <strong>#${order.orderNumber}</strong>.
            </p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">Detalii comandă:</h3>
              <ul style="color: #4b5563; line-height: 1.8;">
                <li>Număr comandă: <strong>${order.orderNumber}</strong></li>
                <li>Data: <strong>${new Date(order.createdAt).toLocaleDateString('ro-RO')}</strong></li>
                <li>Total articole: <strong>${order.totalItems}</strong></li>
                <li>Total de plată: <strong>${order.totalAmount.toFixed(2)} LEI</strong></li>
              </ul>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Comanda dumneavoastră este în curs de procesare. Veți fi notificat când aceasta 
              va fi gata de ridicare.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              Pentru orice nelămuriri, nu ezitați să ne contactați la:<br>
              📞 0722 123 456 | ✉️ contact@curatarie.ro
            </p>
          </div>
          
          <div style="background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 Curățătorie Profesională. Toate drepturile rezervate.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Factura_${order.orderNumber}.pdf`,
          path: invoicePath
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`Factură trimisă cu succes la ${to}`);
    
  } catch (error) {
    console.error('Eroare la trimiterea email:', error);
    throw new Error('Nu s-a putut trimite emailul');
  }
};

// Verificare conexiune SMTP
export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('✅ Conexiune SMTP verificată cu succes');
    return true;
  } catch (error) {
    console.error('❌ Eroare la verificarea conexiunii SMTP:', error);
    return false;
  }
};