'use server';

/**
 * @fileOverview Simulates generating a validated LHDN e-invoice.
 *
 * - generateEInvoice - A function that handles the e-invoice generation process.
 * - EInvoiceInput - The input type for the generateEInvoice function.
 * - EInvoiceOutput - The return type for the generateEInvoice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  validationUrl: z.string().url().describe("A URL to the validated e-invoice on the MyInvois portal."),
  qrCodeData: z.string().describe("A string of data to be encoded into a QR code for verification."),
  status: z.string().describe("The validation status, e.g., 'Validated'."),
  validatedAt: z.string().datetime().describe("The ISO 8601 timestamp of when the invoice was validated.")
});
export type EInvoiceOutput = z.infer<typeof EInvoiceOutputSchema>;

export async function generateEInvoice(input: EInvoiceInput): Promise<EInvoiceOutput> {
  return generateEInvoiceFlow(input);
}

const prompt = ai.definePrompt({
    name: 'generateEInvoicePrompt',
    input: { schema: EInvoiceInputSchema },
    output: { schema: EInvoiceOutputSchema },
    prompt: `You are simulating the LHDN MyInvois API. You will receive invoice data and must return a validated e-invoice JSON object.

    Invoice Details:
    - Order ID: {{{orderId}}}
    - Order Date: {{{orderDate}}}
    - Total Amount (MYR): {{{total}}}
    - Seller: {{{seller.name}}} (TIN: {{{seller.tin}}})
    - Buyer: {{{buyer.name}}} (TIN: {{{buyer.tin}}})
    - Buyer Address: {{{buyer.address}}}
    - Items:
    {{#each items}}
      - {{this.name}} ({{this.quantity}} x {{this.price}})
    {{/each}}

    Your task is to:
    1.  Generate a unique, random alphanumeric string for 'invoiceId'. It should look like a real government ID with a mix of letters and numbers, 15-20 characters long.
    2.  Create a plausible but fake 'validationUrl' on the 'myinvois.hasil.gov.my' domain that includes the invoiceId.
    3.  Generate a 'qrCodeData' string containing key invoice details: invoiceId, seller TIN, buyer TIN, total amount, and a timestamp.
    4.  Set the 'status' to 'Validated'.
    5.  Set 'validatedAt' to the current ISO 8601 timestamp.

    Return only the JSON object.`,
});

const generateEInvoiceFlow = ai.defineFlow({
    name: 'generateEInvoiceFlow',
    inputSchema: EInvoiceInputSchema,
    outputSchema: EInvoiceOutputSchema,
}, async (input) => {
    const { output } = await prompt(input);
    return output!;
});
