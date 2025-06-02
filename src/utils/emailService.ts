// src/utils/emailService.ts - Updated with order ready notification
import nodemailer from 'nodemailer';
import { config } from '../config/config';
import { IOrderDocument } from '../models/Order';
import { logger } from './logger';

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

// Trimite notificare că comanda este gata de ridicare
export const sendOrderReadyNotification = async (order: IOrderDocument): Promise<void> => {
  try {
    console.log('📧 sendOrderReadyNotification called for order:', order.orderNumber);
    
    // Verifică dacă clientul are email
    if (!order.customer.email) {
      console.log(`⚠️  Nu se poate trimite email pentru comanda ${order.orderNumber} - clientul nu are email`);
      logger.warn(`Nu se poate trimite email pentru comanda ${order.orderNumber} - clientul nu are email`);
      return;
    }

    console.log('📧 Preparing to send email to:', order.customer.email);

    // Calculează timpul estimat de la creare până la finalizare
    const createdAt = new Date(order.createdAt);
    const readyAt = new Date(order.readyAt || new Date());
    const processingTime = Math.round((readyAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)); // ore

    const mailOptions = {
      from: `"Curățătorie Profesională" <${config.email.from}>`,
      to: order.customer.email,
      subject: `✅ Comanda ${order.orderNumber} este gata de ridicare!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🎉 Comanda Dvs. este gata!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Vă așteptăm să o ridicați</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 30px 20px; background-color: white;">
            <h2 style="color: #1f2937; margin-top: 0;">Bună ziua, ${order.customer.name}!</h2>
            
            <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); padding: 20px; border-radius: 12px; border-left: 4px solid #10b981; margin: 20px 0;">
              <p style="color: #065f46; margin: 0; font-size: 18px; font-weight: 600;">
                ✅ Comanda dumneavoastră #${order.orderNumber} este gata de ridicare!
              </p>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
              Suntem bucuroși să vă anunțăm că toate articolele din comanda dumneavoastră au fost 
              procesate cu succes și sunt gata pentru ridicare.
            </p>
            
            <!-- Order Details -->
            <div style="background-color: #f9fafb; padding: 25px; border-radius: 12px; margin: 25px 0;">
              <h3 style="color: #1f2937; margin-top: 0; display: flex; align-items: center;">
                📋 Detalii comandă
              </h3>
              
              <div style="display: grid; gap: 12px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280; font-weight: 500;">Număr comandă:</span>
                  <span style="color: #1f2937; font-weight: 600;">${order.orderNumber}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280; font-weight: 500;">Data comenzii:</span>
                  <span style="color: #1f2937; font-weight: 600;">${createdAt.toLocaleDateString('ro-RO', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280; font-weight: 500;">Finalizată la:</span>
                  <span style="color: #10b981; font-weight: 600;">${readyAt.toLocaleDateString('ro-RO', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280; font-weight: 500;">Total articole:</span>
                  <span style="color: #1f2937; font-weight: 600;">${order.totalItems} ${order.totalItems === 1 ? 'articol' : 'articole'}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                  <span style="color: #6b7280; font-weight: 500;">Total de plată:</span>
                  <span style="color: #1f2937; font-weight: 700; font-size: 18px;">${order.totalAmount.toFixed(2)} LEI</span>
                </div>
              </div>
            </div>
            
            <!-- Items List -->
            <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 12px; margin: 25px 0;">
              <div style="background-color: #f3f4f6; padding: 15px 20px; border-radius: 12px 12px 0 0; border-bottom: 1px solid #e5e7eb;">
                <h4 style="margin: 0; color: #1f2937;">🧺 Articolele dumneavoastră:</h4>
              </div>
              
              <div style="padding: 20px;">
                ${order.items.map((item, index) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; ${index < order.items.length - 1 ? 'border-bottom: 1px solid #f3f4f6;' : ''}">
                    <div>
                      <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">
                        ${item.serviceName}
                      </div>
                      <div style="font-size: 14px; color: #6b7280;">
                        Cantitate: ${item.quantity} ${item.quantity === 1 ? 'bucată' : 'bucăți'}
                      </div>
                      ${item.notes ? `<div style="font-size: 12px; color: #f59e0b; margin-top: 4px;">📝 ${item.notes}</div>` : ''}
                    </div>
                    <div style="text-align: right;">
                      <div style="font-weight: 600; color: #1f2937;">
                        ${item.totalPrice.toFixed(2)} LEI
                      </div>
                      <div style="font-size: 12px; color: #10b981; font-weight: 500;">
                        ✅ Gata
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <!-- Pickup Information -->
            <div style="background: linear-gradient(135deg, #eff6ff, #dbeafe); padding: 25px; border-radius: 12px; border-left: 4px solid #3b82f6; margin: 25px 0;">
              <h3 style="color: #1e40af; margin-top: 0; display: flex; align-items: center;">
                🏪 Informații ridicare
              </h3>
              
              <div style="color: #1e40af; line-height: 1.8;">
                <p style="margin: 8px 0;"><strong>📍 Locația:</strong> ${order.location}</p>
                <p style="margin: 8px 0;"><strong>🕒 Program:</strong> Luni - Vineri: 08:00 - 20:00, Sâmbătă: 08:00 - 16:00</p>
                <p style="margin: 8px 0;"><strong>📞 Telefon:</strong> 0722 123 456</p>
                <p style="margin: 8px 0;"><strong>💳 Plata:</strong> Cash sau card la ridicare</p>
              </div>
            </div>
            
            ${processingTime > 0 ? `
            <div style="background-color: #fefce8; padding: 20px; border-radius: 12px; border-left: 4px solid #eab308; margin: 25px 0;">
              <p style="color: #a16207; margin: 0; display: flex; align-items: center;">
                ⚡ <strong style="margin-left: 8px;">Comanda procesată în ${processingTime} ${processingTime === 1 ? 'oră' : 'ore'}!</strong>
              </p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #1f2937; font-size: 18px; font-weight: 600; margin-bottom: 15px;">
                Vă mulțumim pentru încrederea acordată! 🙏
              </p>
              <p style="color: #6b7280; line-height: 1.6;">
                Echipa noastră vă așteaptă cu plăcere pentru ridicarea comenzii.<br>
                Pentru orice întrebări, nu ezitați să ne contactați.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #1f2937; color: #9ca3af; padding: 25px 20px; text-align: center;">
            <div style="margin-bottom: 15px;">
              <p style="color: #f3f4f6; font-weight: 600; margin: 0;">Curățătorie Profesională</p>
              <p style="margin: 5px 0 0 0; font-size: 14px;">Calitate și profesionalism de peste 10 ani</p>
            </div>
            
            <div style="border-top: 1px solid #374151; padding-top: 15px; font-size: 12px;">
              <p style="margin: 0;">© 2024 Curățătorie Profesională. Toate drepturile rezervate.</p>
              <p style="margin: 5px 0 0 0;">
                📧 contact@curatarie.ro | 📞 0722 123 456 | 🌐 www.curatarie.ro
              </p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    
    logger.info(`Email de notificare trimis cu succes pentru comanda ${order.orderNumber}`, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerEmail: order.customer.email,
      customerName: order.customer.name
    });

    console.log(`📧 Email de notificare trimis cu succes la ${order.customer.email} pentru comanda ${order.orderNumber}`);
    
  } catch (error) {
    logger.error(`Eroare la trimiterea email-ului de notificare pentru comanda ${order.orderNumber}:`, {
      error: error instanceof Error ? error.message : String(error),
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerEmail: order.customer.email
    });

    console.error(`❌ Eroare la trimiterea email-ului pentru comanda ${order.orderNumber}:`, error);
    
    // Nu aruncă eroarea pentru a nu bloca procesul principal
    // Email-ul e o funcționalitate secundară
  }
};

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
    console.log(`📧 Factură trimisă cu succes la ${to}`);
    
  } catch (error) {
    console.error('❌ Eroare la trimiterea email:', error);
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