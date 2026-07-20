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

export interface LatestItem {
  note: string;
  orderItem: OrderItem[];
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
  phone: string;
  freezeMode: string;
  deliveryMode: string;
  items: OrderItem[];
}

export interface UpdateOrderRequest {
  note?: string;
  freezeMode?: string;
  deliveryMode?: string;
  orderDate?: string;
  orderDetailJson?: string;
  items?: OrderItem[];
}

export type OrderStatus = 'กำลังผลิต' | 'ผลิตเสร็จแล้ว' | 'กำลังส่ง' | 'จัดส่งแล้ว';

export interface OrderCard {
  id: number;
  orderId: number;
  orderName: string;
  customerId: number;
  customerName: string;
  deliveryAddress: string;
  orderDate: string;
  status: OrderStatus;
  note: string;
  phone: string;
  freezeMode: string;
  deliveryMode: string;
  items: OrderItem[];
  location: string;
  imagePath?: string | null;
}

export const ORDER_STATUSES: OrderStatus[] = ['กำลังผลิต', 'ผลิตเสร็จแล้ว', 'กำลังส่ง', 'จัดส่งแล้ว'];
