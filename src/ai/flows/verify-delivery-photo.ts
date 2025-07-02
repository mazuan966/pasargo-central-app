// src/ai/flows/verify-delivery-photo.ts
'use server';

/**
 * @fileOverview Verifies delivery completion based on a photo of the signed receipt.
 *
 * - verifyDeliveryPhoto - A function that handles the delivery photo verification process.
 * - VerifyDeliveryPhotoInput - The input type for the verifyDeliveryPhoto function.
 * - VerifyDeliveryPhotoOutput - The return type for the verifyDeliveryPhoto function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VerifyDeliveryPhotoInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the signed delivery receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  orderId: z.string().describe('The ID of the order being verified.'),
});
export type VerifyDeliveryPhotoInput = z.infer<typeof VerifyDeliveryPhotoInputSchema>;

const VerifyDeliveryPhotoOutputSchema = z.object({
  isOrderCompleted: z
    .boolean()
    .describe('Whether the order is successfully completed based on the photo.'),
  confidence: z
    .number()
    .describe(
      'A confidence score (0-1) indicating the certainty of the order completion verification.'
    ),
  notes: z.string().optional().describe('Any notes or observations about the delivery photo.'),
});
export type VerifyDeliveryPhotoOutput = z.infer<typeof VerifyDeliveryPhotoOutputSchema>;

export async function verifyDeliveryPhoto(
  input: VerifyDeliveryPhotoInput
): Promise<VerifyDeliveryPhotoOutput> {
  return verifyDeliveryPhotoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'verifyDeliveryPhotoPrompt',
  input: {schema: VerifyDeliveryPhotoInputSchema},
  output: {schema: VerifyDeliveryPhotoOutputSchema},
  prompt: `You are an expert delivery verification system.

You are provided a photo of a signed delivery receipt.  Determine if the order was successfully completed based on the photo and provide a confidence score. Extract any notes or observations about the delivery photo.

Order ID: {{{orderId}}}
Photo: {{media url=photoDataUri}}

Return a JSON object with the following structure:
{
  "isOrderCompleted": true or false,
  "confidence": a number between 0 and 1,
  "notes": "any notes about the delivery photo"
}
`,
});

const verifyDeliveryPhotoFlow = ai.defineFlow(
  {
    name: 'verifyDeliveryPhotoFlow',
    inputSchema: VerifyDeliveryPhotoInputSchema,
    outputSchema: VerifyDeliveryPhotoOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
