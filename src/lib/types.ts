export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  stock: number;
  "data-ai-hint"?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export type OrderStatus = 'Order Created' | 'Processing' | 'Pick Up' | 'Delivered' | 'Completed' | 'Cancelled';
export type PaymentMethod = 'Cash on Delivery' | 'Bank Transfer';
export type PaymentStatus = 'Pending Payment' | 'Paid' | 'Pending Confirmation';

export interface Order {
  id: string;
  user: {
    id: string;
    restaurantName: string;
    latitude?: number;
    longitude?: number;
  };
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  status: OrderStatus;
  orderDate: string;
  deliveryDate?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryPhotoUrl?: string;
  paymentProofUrl?: string;
  deliveryVerification?: {
    isOrderCompleted: boolean;
    confidence: number;
    notes?: string;
    verifiedAt: string;
  };
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
  }[];
}
