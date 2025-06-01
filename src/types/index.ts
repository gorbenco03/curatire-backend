// src/types/index.ts
export interface IUser {
  _id?: string;
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

export interface ICustomer {
  name: string;
  phone: string;
  email?: string;
}

export interface IOrderItem {
  _id?: string;
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

export interface IOrder {
  _id?: string;
  orderNumber: string;
  customer: ICustomer;
  items: IOrderItem[];
  totalAmount: number;
  totalItems: number;
  status: 'pending' | 'in_progress' | 'ready' | 'completed';
  createdAt: Date;
  readyAt?: Date;
  collectedAt?: Date;
  createdBy: string;
  location: string;
  notes?: string;
  updatedAt: Date;
}

export interface IService {
  code: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  priceMax?: number;
  isActive: boolean;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: { [key: string]: string };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Request Types
export interface CreateOrderRequest {
  customer: ICustomer;
  items: Array<{
    serviceCode: string;
    serviceName: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
  notes?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterUserRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: IUser['role'];
  location: string;
}