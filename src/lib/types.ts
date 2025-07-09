
import { z } from 'zod';
import type { Language } from '@/context/LanguageProvider';

export const ProductVariantSchema = z.object({
  id: z.string().min(1), // Unique ID for the variant
  name: z.string().min(1, 'Variant name is required.'), // e.g., "5kg"
  price: z.coerce.number().min(0, 'Price must be a positive number.'),
  stock: z.coerce.number().int('Stock must be a whole number.'),
  unit: z.enum(['item', 'kg']),
});
export type ProductVariant = z.infer<typeof ProductVariantSchema>;

export const ProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Product name is required.'),
  description: z.string().min(1, 'Description is required.'),
  category: z.string().min(1, 'Category is required.'),
  imageUrl: z.string().url('Must be a valid URL.'),
  "data-ai-hint": z.string().optional(),
  hasSst: z.boolean().default(false).optional(),
  variants: z.array(ProductVariantSchema).min(1, "Product must have at least one variant."),
  name_ms: z.string().optional(),
  description_ms: z.string().optional(),
  category_ms: z.string().optional(),
  name_th: z.string().optional(),
  description_th: z.string().optional(),
  category_th: z.string().optional(),
});
export type Product = z.infer<typeof ProductSchema> & {
    id: string;
};


export interface CartItem {
  id: string; // Composite ID: productId_variantId
  productId: string;
  productName: string;
  productName_ms?: string;
  productName_th?: string;
  description?: string;
  description_ms?: string;
  description_th?: string;
  category: string;
  category_ms?: string;
  category_th?: string;

  variantId: string;
  variantName: string;
  
  quantity: number;
  price: number;
  unit: 'item' | 'kg';
  stock: number; // variant stock
  imageUrl: string;
  hasSst?: boolean;
}

export type OrderStatus = 'Awaiting Payment' | 'Order Created' | 'Processing' | 'Pick Up' | 'Delivered' | 'Completed' | 'Cancelled';
export type PaymentMethod = 'Cash on Delivery' | 'FPX (Toyyibpay)';
export type PaymentStatus = 'Awaiting Payment' | 'Pending Payment' | 'Paid' | 'Failed';

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

export interface BusinessDetails {
  id?: string; // a fixed id like 'business'
  name: string;
  address: string;
  phone: string;
  email: string;
  tin: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  user: User;
  items: {
    productId: string;
    variantId: string;
    name: string; // Product name
    name_ms?: string;
    name_th?: string;
    variantName: string; // Variant name e.g., "5kg"
    quantity: number;
    price: number;
    unit: 'item' | 'kg';
    hasSst?: boolean;
    amendmentStatus?: 'original' | 'added' | 'updated';
  }[];
  subtotal: number;
  sst: number;
  total: number;
  status: OrderStatus;
  orderDate: string;
  deliveryDate: string;
  deliveryTimeSlot: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  toyyibpayBillCode?: string;
  deliveryPhotoUrl?: string;
  paymentProofUrl?: string;
  language?: Language;
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
  isEditable?: boolean;
}
