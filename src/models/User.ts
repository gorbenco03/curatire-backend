// src/models/User.ts
import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { config } from '../config/config';

export interface IUser {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'receptie' | 'procesare' | 'admin' | 'super_admin';
  location: string;
  isActive: boolean;
  avatar?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>({
  name: {
    type: String,
    required: [true, 'Numele este obligatoriu'],
    trim: true,
    minlength: [2, 'Numele trebuie să aibă cel puțin 2 caractere'],
    maxlength: [100, 'Numele nu poate depăși 100 de caractere']
  },
  email: {
    type: String,
    required: [true, 'Email-ul este obligatoriu'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Format email invalid']
  },
  password: {
    type: String,
    required: [true, 'Parola este obligatorie'],
    minlength: [6, 'Parola trebuie să aibă cel puțin 6 caractere']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^(\+4|4|0)\d{9}$/, 'Format telefon invalid']
  },
  role: {
    type: String,
    enum: ['receptie', 'procesare', 'admin', 'super_admin'],
    default: 'receptie'
  },
  location: {
    type: String,
    required: [true, 'Locația este obligatorie'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  avatar: {
    type: String
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexuri pentru performanță
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ location: 1 });
UserSchema.index({ isActive: 1 });

// Middleware pentru hash-uirea parolei înainte de salvare
UserSchema.pre('save', async function(next) {
  // Doar dacă parola a fost modificată
  if (!this.isModified('password')) return next();
  
  try {
    // Hash-uiește parola
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as any);
  }
});

// Interface pentru documentul Mongoose
export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  toSafeObject(): Partial<IUser>;
  updateLastLogin(): Promise<void>;
}

// Metoda pentru compararea parolelor
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Metoda pentru generarea JWT token-ului
UserSchema.methods.generateAuthToken = function(): string {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
    location: this.location,
    name: this.name
  };
  
  return jwt.sign(payload, config.jwt.secret as Secret, {
    expiresIn: config.jwt.expiresIn
  } as SignOptions);
};

// Metoda pentru returnarea datelor sigure (fără parolă)
UserSchema.methods.toSafeObject = function(): Partial<IUser> {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Metoda pentru actualizarea ultimei conectări
UserSchema.methods.updateLastLogin = async function(): Promise<void> {
  this.lastLogin = new Date();
  await this.save();
};

// Statics pentru queries comune
UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true }).select('-password');
};

UserSchema.statics.findByRole = function(role: string) {
  return this.find({ role }).select('-password');
};

UserSchema.statics.findByLocation = function(location: string) {
  return this.find({ location }).select('-password');
};

// Virtual pentru numele complet (dacă vrei să adaugi prenume separat în viitor)
UserSchema.virtual('displayName').get(function() {
  return this.name;
});

// Asigură că virtual fields sunt incluse în JSON
UserSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    return ret;
  }
});

UserSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    return ret;
  }
});

// Interface pentru model cu statics
export interface IUserModel extends mongoose.Model<IUserDocument> {
  findByEmail(email: string): Promise<IUserDocument | null>;
  findActiveUsers(): Promise<IUserDocument[]>;
  findByRole(role: string): Promise<IUserDocument[]>;
  findByLocation(location: string): Promise<IUserDocument[]>;
}

export const User = mongoose.model<IUserDocument, IUserModel>('User', UserSchema);