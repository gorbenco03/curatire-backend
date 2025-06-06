// src/config/config.ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  mongodb: {
    uri: 'mongodb+srv://chiril:gorbenco03@laundry.6lov0yl.mongodb.net/?retryWrites=true&w=majority&appName=Laundry',
    testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/curatarie_test'
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  // Email
 email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port:2587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: 'chiril.gorbenco.em@gmail.com',
    pass: 'tgtx tkvx ttei iznu',
    from: process.env.EMAIL_FROM || 'noreply@curatarie.ro'
  },
  
  
  
  // SMS
  sms: {
    apiKey: process.env.SMS_API_KEY,
    apiUrl: process.env.SMS_API_URL
  },
  
  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
    path: process.env.UPLOAD_PATH || './uploads'
  },
  
  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
qrCode: {
    size: 300,
    quality: 'H' as const // High error correction
  }
};
