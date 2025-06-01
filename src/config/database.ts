import mongoose from 'mongoose';
import { config } from './config';

export const connectDatabase = async (): Promise<void> => {
  try {
    const uri = config.nodeEnv === 'test' ? config.mongodb.testUri : config.mongodb.uri;
    
    await mongoose.connect(uri, {
      // Opțiuni pentru mongoose
    });

    console.log(`✅ MongoDB conectat: ${mongoose.connection.host}`);
    
    // Event listeners pentru baza de date
    mongoose.connection.on('error', (error) => {
      console.error('❌ Eroare MongoDB:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB deconectat');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('📦 MongoDB conexiune închisă prin app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Eroare la conectarea MongoDB:', error);
    process.exit(1);
  }
};