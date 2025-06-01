// src/server.ts
import { app } from './app';
import { connectDatabase } from './config/database';
import { config } from './config/config';
import { createSeedUsers } from './utils/seedUsers';

const startServer = async () => {
  console.log('🚀 Începem pornirea serverului...');
  
  try {
    // Conectare la baza de date
    await connectDatabase();
    console.log('✅ Conectare la baza de date reușită');
    
    // Seeding utilizatori (doar dacă e necesar)
    await createSeedUsers();
    
    // Pornire server
    const server = app.listen(config.port, () => {
      console.log('\n🎉 Server pornit cu succes!');
      console.log(`📍 Mediu: ${config.nodeEnv}`);
      console.log(`🌐 URL: http://localhost:${config.port}`);
      console.log(`📚 API Docs: http://localhost:${config.port}/api/v1`);
      console.log('\n📋 Utilizatori demo disponibili:');
      console.log('  🔐 Super Admin: super@curatarie.ro / super123');
      console.log('  👨‍💼 Admin: admin@curatarie.ro / admin123');
      console.log('  📞 Recepție: receptie@curatarie.ro / receptie123');
      console.log('  ⚙️  Procesare: procesare@curatarie.ro / procesare123');
      console.log('\n⚡ Serverul este gata pentru conexiuni!\n');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('📦 SIGTERM primit. Închidere graceful...');
      server.close(() => {
        console.log('✅ Server închis');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\n📦 SIGINT primit. Închidere graceful...');
      server.close(() => {
        console.log('✅ Server închis');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Eroare la pornirea serverului:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

startServer();