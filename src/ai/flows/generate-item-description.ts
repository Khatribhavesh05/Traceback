'use server';

/**
 * @fileOverview A flow to generate an item description from an image.
 *
 * - generateItemDescription - A function that generates an item description from an image.
 * - GenerateItemDescriptionInput - The input type for the generateItemDescription function.
 * - GenerateItemDescriptionOutput - The return type for the generateItemDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  GenerateItemDescriptionInputSchema,
  type GenerateItemDescriptionInput,
  GenerateItemDescriptionOutputSchema,
  type GenerateItemDescriptionOutput,
} from '@/lib/types';

export async function generateItemDescription(
  input: GenerateItemDescriptionInput
): Promise<GenerateItemDescriptionOutput> {
  return generateItemDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateItemDescriptionPrompt',
  input: {schema: GenerateItemDescriptionInputSchema},
  output: {schema: GenerateItemDescriptionOutputSchema},
  prompt: `You are an expert at describing items based on images.  Generate a detailed description of the item in this photo, being specific about colors, materials, sizes, and any distinguishing features: {{media url=photoDataUri}}`,
});

const generateItemDescriptionFlow = ai.defineFlow(
  {
    name: 'generateItemDescriptionFlow',
    inputSchema: GenerateItemDescriptionInputSchema,
    outputSchema: GenerateItemDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
