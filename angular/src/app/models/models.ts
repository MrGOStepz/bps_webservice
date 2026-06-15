export type Role = 'ADMIN' | 'SALE' | 'STAFF' | 'DELIVERY';

export interface LoginResponse {
  success: boolean;
  role: Role | null;
  name: string | null;
  message: string;
}

export interface Customer {
  customerId?: number | null;
  name: string;
  phone: string;
  address: string;
  location: string;
}

export interface OrderItem {
  name: string;
  quantity: string;
}

export interface OrderRequest {
  customerId: number;
  deliveryAddress: string;
  location: string;
  note: string;
  orderDate: string;
  items: OrderItem[];
}

export type OrderStatus = 'NEW' | 'PREPARING' | 'DELIVERING' | 'DONE';

export interface OrderCard {
  id: number;
  customerId: number;
  customerName: string;
  deliveryAddress: string;
  orderDate: string;
  status: OrderStatus;
  items: OrderItem[];
}

export interface StatusUpdate {
  id: number;
  status: OrderStatus;
}

export const ORDER_STATUSES: OrderStatus[] = ['NEW', 'PREPARING', 'DELIVERING', 'DONE'];
