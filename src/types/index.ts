export interface User {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin';
  addresses: Address[];
  createdAt: any;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalOrdersCount?: number;
  totalSpend?: number;
  outstandingKhataBalance?: number;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  houseFlat: string;
  streetArea: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  brand: string;
  categoryId: string;
  categoryName: string;
  price: number;
  mrp: number;
  discountPercentage: number;
  unit: string;
  imageUrl: string;
  stock: number;
  isAvailable: boolean;
  keywords: string[];
  barcode?: string;
  barcodeType?: string;
  costPrice?: number;
  minStockThreshold?: number;
  createdAt: any;
  updatedAt: any;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface Cart {
  items: CartItem[];
  updatedAt: any;
}

export type OrderStatus = 'placed' | 'confirmed' | 'packing' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'due' | 'partial' | 'paid';
  amountPaid?: number;
  paidAt?: any;
  orderStatus: OrderStatus;
  deliveryAddress: Address;
  coordinates?: {
    lat: number;
    lng: number;
  };
  orderType?: 'online' | 'pos_counter';
  billNumber?: string;
  customerName?: string;
  customerPhone?: string;
  cashierName?: string;
  cashReceived?: number;
  changeGiven?: number;
  createdAt: any;
  updatedAt: any;
}
