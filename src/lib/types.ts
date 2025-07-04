import { z } from 'zod';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: 'item' | 'kg';
  imageUrl: string;
  category: string;
  stock: number;
  "data-ai-hint"?: string;
  hasSst?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export type OrderStatus = 'Order Created' | 'Processing' | 'Pick Up' | 'Delivered' | 'Completed' | 'Cancelled';
export type PaymentMethod = 'Cash on Delivery' | 'Bank Transfer';
export type PaymentStatus = 'Pending Payment' | 'Paid' | 'Pending Confirmation';

export const EInvoiceInputSchema = z.object({
  orderId: z.string(),
  orderDate: z.string(),
  total: z.number(),
  items: z.array(z.object({
      name: z.string(),
      quantity: z.number(),
      price: z.number(),
  })),
  seller: z.object({
      name: z.string(),
      tin: z.string(),
  }),
  buyer: z.object({
      name: z.string(),
      tin: z.string().optional(),
      address: z.string().optional(),
  })
});
export type EInvoiceInput = z.infer<typeof EInvoiceInputSchema>;

export const EInvoiceOutputSchema = z.object({
  invoiceId: z.string().describe("A unique identifier for the e-invoice, provided by LHDN."),
  validationUrl: z.string().describe("A URL to the validated e-invoice on the MyInvois portal."),
  qrCodeData: z.string().describe("A string of data to be encoded into a QR code for verification."),
  status: z.string().describe("The validation status, e.g., 'Validated'."),
  validatedAt: z.string().datetime().describe("The ISO 8601 timestamp of when the invoice was validated.")
});
export type EInvoiceOutput = z.infer<typeof EInvoiceOutputSchema>;

export type EInvoice = EInvoiceOutput;

export interface User {
  id: string; // Firebase Auth UID
  email: string;
  restaurantName: string;
  personInCharge?: string;
  phoneNumber?: string;
  latitude?: number;
  longitude?: number;
  tin?: string;
  address?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  user: User;
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    hasSst?: boolean;
  }[];
  subtotal: number;
  sst: number;
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
  eInvoice?: EInvoice;
}
