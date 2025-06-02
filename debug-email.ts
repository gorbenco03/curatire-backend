// debug-email.ts - Script pentru debug email functionality
import mongoose from 'mongoose';
import { Order } from './src/models/Order';
import { config } from './src/config/config';

async function debugEmailFunctionality() {
  try {
    // Conectează la MongoDB
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ Conectat la MongoDB');

    // Găsește comanda problemă
    const orderNumber = 'CMD9QUH0';
    const order = await Order.findOne({ orderNumber });

    if (!order) {
      console.log(`❌ Comanda ${orderNumber} nu există`);
      return;
    }

    console.log('📋 Detalii comandă:', {
      orderNumber: order.orderNumber,
      status: order.status,
      emailSent: order.emailSent,
      hasEmail: !!order.customer.email,
      customerEmail: order.customer.email,
      customerName: order.customer.name,
      readyAt: order.readyAt
    });

    console.log('📦 Items status:');
    order.items.forEach(item => {
      console.log(`  - ${item.itemCode}: ${item.status} (${item.serviceName})`);
    });

    const readyItems = order.items.filter(item => item.status === 'ready').length;
    const totalItems = order.items.length;

    console.log(`📊 Progress: ${readyItems}/${totalItems} items ready`);

    // Verifică dacă toate condițiile pentru email sunt îndeplinite
    console.log('\n🔍 Verificare condiții email:');
    console.log('✓ Toate itemele ready?', readyItems === totalItems);
    console.log('✓ Clientul are email?', !!order.customer.email);
    console.log('✓ Email nu a fost trimis?', !order.emailSent);
    console.log('✓ Status comandă ready?', order.status === 'ready');

    // Încearcă să trimită email manual
    if (order.customer.email && order.status === 'ready') {
      console.log('\n📧 Testare trimitere email manual...');
      
      const { sendOrderReadyNotification } = await import('./src/utils/emailService');
      
      try {
        await sendOrderReadyNotification(order);
        console.log('✅ Email trimis cu succes!');
        
        // Marchează emailSent
        await order.updateOne({ emailSent: true });
        console.log('✅ Flag emailSent actualizat');
        
      } catch (emailError) {
        console.error('❌ Eroare la trimiterea email:', emailError);
      }
    } else {
      console.log('⚠️  Nu se poate trimite email - condiții neîndeplinite');
    }

    // Testează și conexiunea SMTP
    console.log('\n🔧 Testare conexiune SMTP...');
    const { verifyEmailConnection } = await import('./src/utils/emailService');
    
    try {
      const isConnected = await verifyEmailConnection();
      console.log('📧 SMTP Connection:', isConnected ? '✅ OK' : '❌ Failed');
    } catch (smtpError) {
      console.error('❌ Eroare SMTP:', smtpError);
    }

  } catch (error) {
    console.error('❌ Eroare în script:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Deconectat de la MongoDB');
  }
}

// Verifică și configurarea email
function checkEmailConfig() {
  console.log('\n🔧 Verificare configurare email:');
  console.log('SMTP_HOST:', process.env.SMTP_HOST || 'Not set');
  console.log('SMTP_PORT:', process.env.SMTP_PORT || 'Not set');
  console.log('SMTP_USER:', process.env.SMTP_USER || 'Not set');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***SET***' : 'Not set');
  console.log('SMTP_FROM:', process.env.SMTP_FROM || 'Not set');
}

// Rulează scriptul
console.log('🚀 Începe debugging email functionality...\n');
checkEmailConfig();
debugEmailFunctionality().then(() => {
  console.log('\n🏁 Debug script finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});

export {};