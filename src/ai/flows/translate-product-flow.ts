
'use server';

/**
 * @fileOverview Translates product details into multiple languages.
 *
 * - translateProduct - A function that handles the product translation process.
 * - TranslateProductInput - The input type for the translateProduct function.
 * - TranslateProductOutput - The return type for the translateProduct function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateProductInputSchema = z.object({
  name: z.string().describe('The product name in English.'),
  description: z.string().describe('The product description in English.'),
});
export type TranslateProductInput = z.infer<typeof TranslateProductInputSchema>;

const TranslateProductOutputSchema = z.object({
    name_ms: z.string().describe('The translated product name in Malay.'),
    description_ms: z.string().describe('The translated product description in Malay.'),
    name_th: z.string().describe('The translated product name in Thai.'),
    description_th: z.string().describe('The translated product description in Thai.'),
});
export type TranslateProductOutput = z.infer<typeof TranslateProductOutputSchema>;


export async function translateProduct(input: TranslateProductInput): Promise<TranslateProductOutput> {
  return translateProductFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateProductPrompt',
  input: {schema: TranslateProductInputSchema},
  output: {schema: TranslateProductOutputSchema},
  prompt: `You are an expert translator for an e-commerce platform.
    Translate the following product name and description from English into Malay and Thai.
    
    Return ONLY the JSON object with the translated fields.

    Product Name: {{{name}}}
    Product Description: {{{description}}}
  `,
});

const translateProductFlow = ai.defineFlow(
  {
    name: 'translateProductFlow',
    inputSchema: TranslateProductInputSchema,
    outputSchema: TranslateProductOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
