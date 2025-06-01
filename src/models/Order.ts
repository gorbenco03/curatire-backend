// src/models/Order.ts - Fixed version
import mongoose, { Schema, Document } from 'mongoose';
import { ICustomer } from '../types';

// Interface pentru OrderItem
export interface IOrderItem {
  _id?: string;
  itemCode: string; // Cod unic pentru articol (nu _id)
  serviceCode: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: 'pending' | 'ready';
  notes?: string;
  qrCode: string;
  qrCodePath?: string;
  scannedAt?: Date;
  scannedBy?: string;
}

// Schema pentru customer
const CustomerSchema = new Schema<ICustomer>({
  name: {
    type: String,
    required: [true, 'Numele clientului este obligatoriu'],
    trim: true,
    minlength: [2, 'Numele trebuie să aibă cel puțin 2 caractere'],
    maxlength: [100, 'Numele nu poate depăși 100 de caractere']
  },
  phone: {
    type: String,
    required: [true, 'Telefonul clientului este obligatoriu'],
    trim: true,
    match: [/^(\+4|4|0)\d{9}$/, 'Format telefon invalid']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Format email invalid']
  }
}, { _id: false });

// Schema pentru articolele comenzii
const OrderItemSchema = new Schema<IOrderItem>({
  itemCode: {
    type: String,
    required: [true, 'Codul articolului este obligatoriu'],
    unique: true,
    trim: true
  },
  serviceCode: {
    type: String,
    required: [true, 'Codul serviciului este obligatoriu'],
    trim: true
  },
  serviceName: {
    type: String,
    required: [true, 'Numele serviciului este obligatoriu'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Cantitatea este obligatorie'],
    min: [1, 'Cantitatea trebuie să fie cel puțin 1']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Prețul unitar este obligatoriu'],
    min: [0, 'Prețul unitar nu poate fi negativ']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Prețul total este obligatoriu'],
    min: [0, 'Prețul total nu poate fi negativ']
  },
  status: {
    type: String,
    enum: ['pending', 'ready'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notele nu pot depăși 500 de caractere']
  },
  qrCode: {
    type: String,
    required: [true, 'QR code-ul este obligatoriu'],
    default: 'pending' // Valoare default până se generează
  },
  qrCodePath: {
    type: String
  },
  scannedAt: {
    type: Date
  },
  scannedBy: {
    type: String
  }
}, {
  timestamps: true
});

// Interface pentru Order
export interface IOrder {
  orderNumber: string;
  customer: ICustomer;
  items: IOrderItem[];
  totalAmount: number;
  totalItems: number;
  status: 'pending' | 'in_progress' | 'ready' | 'completed';
  location: string;
  notes?: string;
  readyAt?: Date;
  collectedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Schema principală pentru comandă
const OrderSchema = new Schema<IOrderDocument>({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  customer: {
    type: CustomerSchema,
    required: [true, 'Datele clientului sunt obligatorii']
  },
  items: {
    type: [OrderItemSchema],
    required: [true, 'Articolele comenzii sunt obligatorii'],
    validate: {
      validator: function(items: IOrderItem[]) {
        return items && items.length > 0;
      },
      message: 'Comanda trebuie să aibă cel puțin un articol'
    }
  },
  totalAmount: {
    type: Number,
    required: [true, 'Suma totală este obligatorie'],
    min: [0, 'Suma totală nu poate fi negativă']
  },
  totalItems: {
    type: Number,
    required: [true, 'Numărul total de articole este obligatoriu'],
    min: [1, 'Trebuie să existe cel puțin un articol']
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'ready', 'completed'],
    default: 'pending'
  },
  location: {
    type: String,
    required: [true, 'Locația este obligatorie'],
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notele nu pot depăși 1000 de caractere']
  },
  readyAt: {
    type: Date
  },
  collectedAt: {
    type: Date
  },
  createdBy: {
    type: String,
    required: [true, 'ID-ul utilizatorului care a creat comanda este obligatoriu']
  }
}, {
  timestamps: true
});

// Indexuri pentru performanță
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ 'customer.phone': 1 });
OrderSchema.index({ 'customer.email': 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ location: 1 });
OrderSchema.index({ 'items.itemCode': 1 });

// Middleware pentru a genera numărul comenzii automat
OrderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `CMD${timestamp}${random}`;
  }
  next();
});

// Middleware pentru a actualiza statusul comenzii bazat pe articole
OrderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    // Skip status updates if the order is completed or being marked as completed
    if (this.status === 'completed') {
      next();
      return;
    }

    const readyItems = this.items.filter(item => item.status === 'ready').length;
    const totalItems = this.items.length;
    
    if (readyItems === 0) {
      this.status = 'pending';
    } else if (readyItems === totalItems) {
      this.status = 'ready';
      if (!this.readyAt) {
        this.readyAt = new Date();
      }
    } else {
      this.status = 'in_progress';
    }
  }
  next();
});

// Interface pentru documentul Mongoose
export interface IOrderDocument extends IOrder, Document {
  markAsCollected(): Promise<IOrderDocument>;
  getProgress(): number;
}

// Metode pentru document
OrderSchema.methods.markAsCollected = function() {
  this.status = 'completed';
  this.collectedAt = new Date();
  return this.save();
};

OrderSchema.methods.getProgress = function() {
  if (!this.items || this.items.length === 0) return 0;
  const readyItems = this.items.filter((item: IOrderItem) => item.status === 'ready').length;
  return Math.round((readyItems / this.items.length) * 100);
};

// Statics pentru queries comune
OrderSchema.statics.findByOrderNumber = function(orderNumber: string) {
  return this.findOne({ orderNumber });
};

OrderSchema.statics.findByCustomerPhone = function(phone: string) {
  return this.find({ 'customer.phone': phone }).sort({ createdAt: -1 });
};

OrderSchema.statics.findByStatus = function(status: string) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Virtual pentru a obține articolele gata
OrderSchema.virtual('readyItems').get(function() {
  return this.items ? this.items.filter((item: IOrderItem) => item.status === 'ready') : [];
});

// Virtual pentru a obține articolele în așteptare
OrderSchema.virtual('pendingItems').get(function() {
  return this.items ? this.items.filter((item: IOrderItem) => item.status === 'pending') : [];
});

// Asigură că virtual fields sunt incluse în JSON
OrderSchema.set('toJSON', { virtuals: true });
OrderSchema.set('toObject', { virtuals: true });

// Interface pentru model cu statics
export interface IOrderModel extends mongoose.Model<IOrderDocument> {
  findByOrderNumber(orderNumber: string): Promise<IOrderDocument | null>;
  findByCustomerPhone(phone: string): Promise<IOrderDocument[]>;
  findByStatus(status: string): Promise<IOrderDocument[]>;
}

export const Order = mongoose.model<IOrderDocument, IOrderModel>('Order', OrderSchema);