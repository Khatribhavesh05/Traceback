'use server';

/**
 * @fileOverview This file defines a Genkit flow to improve the matching algorithm using AI by comparing descriptions of lost and found items.
 *
 * - improveMatchingWithAi - A function that triggers the AI-enhanced matching process.
 * - ImproveMatchingWithAiInput - The input type for the improveMatchingWithAi function.
 * - ImproveMatchingWithAiOutput - The return type for the improveMatchingWithAi function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  ImproveMatchingWithAiInputSchema,
  type ImproveMatchingWithAiInput,
  ImproveMatchingWithAiOutputSchema,
  type ImproveMatchingWithAiOutput,
} from '@/lib/types';

export async function improveMatchingWithAi(
  input: ImproveMatchingWithAiInput
): Promise<ImproveMatchingWithAiOutput> {
  return improveMatchingWithAiFlow(input);
}

const prompt = ai.definePrompt({
  name: 'improveMatchingWithAiPrompt',
  input: {schema: ImproveMatchingWithAiInputSchema},
  output: {schema: ImproveMatchingWithAiOutputSchema},
  prompt: `You are an AI expert in matching lost and found items. Given the descriptions of a lost item and a found item, as well as optional images of each, determine the probability that they are a match.

Lost Item Description: {{{lostItemDescription}}}
Found Item Description: {{{foundItemDescription}}}

{{#if lostItemImageDataUri}}
Lost Item Image: {{media url=lostItemImageDataUri}}
{{/if}}
{{#if foundItemImageDataUri}}
Found Item Image: {{media url=foundItemImageDataUri}}
{{/if}}

Based on this, provide a matchProbability between 0 and 1 (where 0 is no match and 1 is a perfect match) and a reason for your determination.

Be generous with your matching if the descriptions are similar, even if images are missing. Consider factors such as item category, description similarity, and location. For example, if images are missing but descriptions are very close, you should still provide a high match probability.

Format your output as a JSON object.`,
});

const improveMatchingWithAiFlow = ai.defineFlow(
  {
    name: 'improveMatchingWithAiFlow',
    inputSchema: ImproveMatchingWithAiInputSchema,
    outputSchema: ImproveMatchingWithAiOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
