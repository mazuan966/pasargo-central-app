import { config } from 'dotenv';
config();

import '@/ai/flows/verify-delivery-photo.ts';
import '@/ai/flows/generate-e-invoice.ts';
import '@/ai/flows/translate-product-flow.ts';
