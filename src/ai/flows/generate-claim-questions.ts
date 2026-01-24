'use server';

/**
 * @fileOverview A flow to generate verification questions for a lost item claim.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  GenerateClaimQuestionsInputSchema,
  type GenerateClaimQuestionsInput,
  GenerateClaimQuestionsOutputSchema,
  type GenerateClaimQuestionsOutput,
} from '@/lib/types';

export async function generateClaimQuestions(
  input: GenerateClaimQuestionsInput
): Promise<GenerateClaimQuestionsOutput> {
  return generateClaimQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateClaimQuestionsPrompt',
  input: { schema: GenerateClaimQuestionsInputSchema },
  output: { schema: GenerateClaimQuestionsOutputSchema },
  prompt: `You are a security expert for a privacy-first lost and found system. Your task is to generate EXACTLY 3 verification questions to help determine if a claimant is the true owner.

**CRITICAL CONSTRAINTS (MANDATORY):**
You MUST adhere to these rules without exception.
1.  **EXTERNALLY OBSERVABLE ONLY:** Questions MUST be based ONLY on the item's external, physical, and immediately visible characteristics. The finder must be able to verify the answer simply by looking at the item from the outside.
2.  **NO INTERACTION REQUIRED:** The finder must NOT be asked to open, unlock, power on, or interact with the item in any way to verify the answer.

**STRICTLY FORBIDDEN QUESTION TOPICS:**
- **INTERIOR CONTENTS:** NEVER ask about the contents inside a bag, wallet, case, or any other container. No questions about lining, internal compartments, or items stored inside.
- **DIGITAL OR PRIVATE DATA:** NEVER ask about anything that requires powering on, unlocking, or accessing the device's software or data. This includes but is not limited to:
    - Passwords, PINs, lock patterns, or Face/Touch ID.
    - Wallpapers, lock screens, home screen layouts.
    - Installed apps, files, photos, contacts, messages, or browsing history.
    - Any account information (email, social media, etc.).

**ALLOWED QUESTION TOPICS (EXTERNAL ONLY):**
- **Physical Damage:** Scratches, dents, cracks, scuffs on the exterior.
- **External Customizations:** Stickers, engravings, custom cases, charms, keychains attached to the outside.
- **Wear and Tear:** Faded colors, worn-out sections on the exterior surface.
- **Brand/Model:** Visible logos or model numbers.
- **Pets:** Unique fur markings, collar details (color, tags without reading them), specific learned tricks (if verifiable by observation).

**GOOD QUESTION EXAMPLES:**
- "Is there any specific damage, like a scratch or dent, on the item's exterior? If so, where?"
- "Are there any stickers on the outside of the item? If so, what do they depict?"
- "What color is the item, and is there any noticeable wear and tear on its surface?"
- "For the lost dog, what does its collar look like and what color is it?"

**BAD QUESTION EXAMPLES (STRICTLY FORBIDDEN):**
- "What is the wallpaper on the phone?"
- "What brand of laptop is inside the bag?"
- "Is the lining of the wallet red or black?"
- "What is the 4-digit PIN to unlock it?"

**INSTRUCTIONS:**
Based on the item details below, generate EXACTLY 3 short, clear, open-ended questions that follow all the rules above.

**INTERNAL VALIDATION (MANDATORY):**
Before providing the final output, perform a strict self-check for EACH question. Ask yourself: "Can this question be answered by someone who only saw the item from the outside?" If the answer is NO, you MUST discard the question and generate a new one that complies.

Item Category: {{{itemCategory}}}
Lost Item Description: "{{{lostItemDescription}}}"
Found Item Description: "{{{foundItemDescription}}}"
`,
});

const generateClaimQuestionsFlow = ai.defineFlow(
  {
    name: 'generateClaimQuestionsFlow',
    inputSchema: GenerateClaimQuestionsInputSchema,
    outputSchema: GenerateClaimQuestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
