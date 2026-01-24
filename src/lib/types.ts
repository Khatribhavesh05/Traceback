import { z } from 'zod';
import { ITEM_CATEGORIES } from './constants';

export const ReportSchema = z.object({
  type: z.enum(['lost', 'found']),
  category: z.enum(ITEM_CATEGORIES, {
    required_error: 'Please select a category.',
  }),
  date: z.date({
    required_error: 'A date is required.',
  }),
  description: z
    .string()
    .min(10, { message: 'Description must be at least 10 characters.' })
    .max(500, { message: 'Description must be less than 500 characters.' }),
  location: z
    .string()
    .min(3, { message: 'Location must be at least 3 characters.' })
    .max(100, { message: 'Location must be less than 100 characters.' }),
  name: z
    .string()
    .min(2, { message: 'Name must be at least 2 characters.' })
    .max(50, { message: 'Name must be less than 50 characters.' }),
  contact: z
    .string()
    .min(1, { message: 'Contact information is required.' })
    .refine(
      (value) =>
        z.string().email().safeParse(value).success ||
        /^\+?[1-9]\d{1,14}$/.test(value.replace(/[\s-()]/g, '')) ||
        /^\d{10,15}$/.test(value.replace(/[\s-()]/g, '')),
      {
        message: 'Please enter a valid email or phone number.',
      }
    ),
  imageUrl: z.string().url().optional(),
  imagePath: z.string().optional(),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the terms.' }),
  }),
});

export const ItemReportSchema = ReportSchema.extend({
  id: z.string().optional(),
  userId: z.string(),
  status: z.enum(['open', 'claimed', 'closed', 'disputed']),
  createdAt: z.any(), // Firestore Timestamp
  claimId: z.string().optional(),
});
export type ItemReport = z.infer<typeof ItemReportSchema>;


export type MatchResult = {
  id: string;
  score: number;
  reason: string;
  item: ItemReport;
};

export const ClaimQuestionAnswerSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

const ContactExchangeSchema = z.object({
  lostUser: z.object({
    name: z.string(),
    contact: z.string(),
  }),
  foundUser: z.object({
    name: z.string(),
    contact: z.string(),
  }),
});

export const ClaimSchema = z.object({
  id: z.string().optional(),
  lostItemId: z.string(),
  foundItemId: z.string(),
  lostUserId: z.string(),
  foundUserId: z.string(),
  status: z.enum(['pending', 'approved', 'rejected', 'closed', 'disputed']),
  lostUserEmail: z.string().email().optional().nullable(),
  foundUserEmail: z.string().email().optional().nullable(),
  questionsAndAnswers: z.array(ClaimQuestionAnswerSchema).optional(),
  createdAt: z.any(), // serverTimestamp
  updatedAt: z.any(), // serverTimestamp
  approvedAt: z.any().nullable(),
  rejectedAt: z.any().nullable(),
  lostConfirmed: z.boolean(),
  finderConfirmed: z.boolean(),
  closedAt: z.any().nullable(),
  handoverPinHash: z.string().optional(),
  handoverPinLast4: z.string().optional(),
  pinGeneratedAt: z.any().optional(),
  disputeStatus: z.string().optional(),
  foundUserContact: z.string().optional(),
  foundUserName: z.string().optional(),
  lostUserContact: z.string().optional(),
  contactExchange: ContactExchangeSchema.optional(),
});

export type Claim = z.infer<typeof ClaimSchema>;

export const UserProfileSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional().nullable(),
  photoURL: z.string().url().optional().nullable(),
  createdAt: z.any().optional(),
  lastLogin: z.any().optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const ClaimFormSchema = z.object({
  lostItemId: z.string(),
  foundItemId: z.string(),
  answers: z.record(z.string().min(1, { message: 'An answer is required.' })),
  questions: z.array(z.string()),
});


// Schemas for AI Flows

// generate-claim-questions
export const GenerateClaimQuestionsInputSchema = z.object({
  itemCategory: z.string().describe('The category of the item (e.g., wallet, phone).'),
  lostItemDescription: z.string().describe('The description provided by the person who lost the item.'),
  foundItemDescription: z.string().describe('The description provided by the person who found the item.'),
});
export type GenerateClaimQuestionsInput = z.infer<typeof GenerateClaimQuestionsInputSchema>;

export const GenerateClaimQuestionsOutputSchema = z.object({
  questions: z.array(z.string()).describe('An array of 3 to 4 short, open-ended questions to verify ownership.'),
});
export type GenerateClaimQuestionsOutput = z.infer<typeof GenerateClaimQuestionsOutputSchema>;

// generate-item-description
export const GenerateItemDescriptionInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateItemDescriptionInput = z.infer<typeof GenerateItemDescriptionInputSchema>;

export const GenerateItemDescriptionOutputSchema = z.object({
  description: z
    .string()
    .describe('A detailed description of the item in the image.'),
});
export type GenerateItemDescriptionOutput = z.infer<typeof GenerateItemDescriptionOutputSchema>;


// improve-matching-with-ai
export const ImproveMatchingWithAiInputSchema = z.object({
  lostItemDescription: z.string().describe('Description of the lost item.'),
  foundItemDescription: z.string().describe('Description of the found item.'),
  lostItemImageDataUri: z
    .string()
    .optional()
    .describe(
      "A photo of the lost item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  foundItemImageDataUri: z
    .string()
    .optional()
    .describe(
      "A photo of the found item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ImproveMatchingWithAiInput = z.infer<typeof ImproveMatchingWithAiInputSchema>;

export const ImproveMatchingWithAiOutputSchema = z.object({
  matchProbability: z
    .number()
    .min(0)
    .max(1)
    .describe('The probability that the lost item and found item are a match, from 0 to 1.'),
  reason: z.string().describe('The reasoning behind the match probability.'),
});
export type ImproveMatchingWithAiOutput = z.infer<typeof ImproveMatchingWithAiOutputSchema>;
