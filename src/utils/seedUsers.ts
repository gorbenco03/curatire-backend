// src/scripts/seedUsers.ts
import mongoose from 'mongoose';
import { User } from '../models/User';
import { config } from '../config/config';

const seedUsers = [
  {
    name: 'Gheorghe Admin',
    email: 'super@curatarie.ro',
    password: 'super123',
    role: 'super_admin',
    location: 'Toate locațiile',
    phone: '0721123456',
    isActive: true
  },
  {
    name: 'Ana Popescu',
    email: 'admin@curatarie.ro',
    password: 'admin123',
    role: 'admin',
    location: 'Sediul Principal',
    phone: '0721234567',
    isActive: true
  },
  {
    name: 'Maria Ionescu',
    email: 'receptie@curatarie.ro',
    password: 'receptie123',
    role: 'receptie',
    location: 'Sediul Principal',
    phone: '0721345678',
    isActive: true
  },
  {
    name: 'Ion Marinescu',
    email: 'procesare@curatarie.ro',
    password: 'procesare123',
    role: 'procesare',
    location: 'Sediul Principal',
    phone: '0721456789',
    isActive: true
  }
];

export const createSeedUsers = async (): Promise<void> => {
  try {
    console.log('🌱 Începem seeding-ul utilizatorilor...');

    // Verifică dacă există deja utilizatori
    const existingUsersCount = await User.countDocuments();
    
    if (existingUsersCount > 0) {
      console.log(`📊 Există deja ${existingUsersCount} utilizatori în baza de date`);
      
      // Verifică dacă utilizatorii demo există
      const demoEmails = seedUsers.map(u => u.email);
      const existingDemoUsers = await User.find({ 
        email: { $in: demoEmails } 
      }).select('email');
      
      const missingUsers = seedUsers.filter(
        seedUser => !existingDemoUsers.find(existing => existing.email === seedUser.email)
      );

      if (missingUsers.length === 0) {
        console.log('✅ Toți utilizatorii demo există deja');
        return;
      }

      console.log(`📝 Creez ${missingUsers.length} utilizatori lipsă...`);
      
      for (const userData of missingUsers) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ Utilizator creat: ${userData.email} (${userData.role})`);
      }
      
      return;
    }

    // Dacă nu există utilizatori, creează toți utilizatorii demo
    console.log('📝 Creez utilizatorii demo...');
    
    for (const userData of seedUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ Utilizator creat: ${userData.email} (${userData.role})`);
    }

    console.log('🎉 Seeding complet! Utilizatori creați:');
    console.log('  - super@curatarie.ro (super_admin) - parola: super123');
    console.log('  - admin@curatarie.ro (admin) - parola: admin123');
    console.log('  - receptie@curatarie.ro (receptie) - parola: receptie123');
    console.log('  - procesare@curatarie.ro (procesare) - parola: procesare123');

  } catch (error) {
    console.error('❌ Eroare la seeding:', error);
    throw error;
  }
};