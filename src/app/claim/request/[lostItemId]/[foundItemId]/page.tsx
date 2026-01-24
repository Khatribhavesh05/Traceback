'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/firebase-provider';
import { generateClaimQuestions } from '@/ai/flows/generate-claim-questions';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ItemReport } from '@/lib/types';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, HelpCircle, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

const ClaimRequestFormSchema = z.object({
  answers: z.record(z.string().min(1, 'Please provide an answer.')),
});
type ClaimRequestFormType = z.infer<typeof ClaimRequestFormSchema>;

export default function ClaimRequestPage() {
  const params = useParams<{ lostItemId: string; foundItemId: string; }>();
  const { lostItemId, foundItemId } = params;
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [lostItem, setLostItem] = useState<ItemReport | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClaimRequestFormType>({
    resolver: zodResolver(ClaimRequestFormSchema),
  });

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    const fetchAndGenerate = async () => {
      try {
        setIsLoading(true);
        // Fetch items in parallel
        const [lostDocSnap, foundDocSnap] = await Promise.all([
          getDoc(doc(db, 'items', lostItemId)),
          getDoc(doc(db, 'items', foundItemId)),
        ]);

        if (!lostDocSnap.exists() || !foundDocSnap.exists()) {
          throw new Error('One or both items could not be found.');
        }

        const lostData = lostDocSnap.data() as ItemReport;
        if (lostData.userId !== user.uid) {
          throw new Error('You are not authorized to claim this item.');
        }

        setLostItem(lostData);

        // Generate questions
        const questionResult = await generateClaimQuestions({
          itemCategory: lostData.category,
          lostItemDescription: lostData.description,
          foundItemDescription: (foundDocSnap.data() as ItemReport).description,
        });

        if (questionResult.questions && questionResult.questions.length > 0) {
          setQuestions(questionResult.questions);
        } else {
          throw new Error('Could not generate verification questions.');
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndGenerate();
  }, [lostItemId, foundItemId, user, isAuthLoading, router]);

  const onSubmit: SubmitHandler<ClaimRequestFormType> = async (data) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to submit a claim.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Fetch found item to get foundUserId
      const foundItemRef = doc(db, 'items', foundItemId);
      const foundItemSnap = await getDoc(foundItemRef);

      if (!foundItemSnap.exists()) {
        throw new Error("Could not find the 'found' item report.");
      }
      const foundItemData = foundItemSnap.data() as ItemReport;

      // 2. Construct claim data
      const claimData = {
        lostItemId,
        foundItemId,
        lostUserId: user.uid, // ✅ From current authenticated user
        foundUserId: foundItemData.userId, // ✅ From the user who found the item
        lostUserEmail: user.email,
        foundUserEmail: foundItemData.contact,
        questionsAndAnswers: questions.map((q, i) => ({
          question: q,
          answer: data.answers[`question-${i}`] || '',
        })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'pending' as const,
        approvedAt: null,
        rejectedAt: null,
        lostConfirmed: false,
        finderConfirmed: false,
        closedAt: null,
      };

      // 3. Create document using client SDK
      const claimsCollection = collection(db, 'claims');
      await addDoc(claimsCollection, claimData);

      // 4. Success toast and redirect
      toast({
        title: 'Claim Submitted!',
        description: 'Your claim has been sent to the finder for verification.',
      });
      router.push(`/report/lost/${lostItemId}/matches`);

    } catch (err: any) {
      // 5. Error logging
      console.error('❌ ERROR submitting claim:', err);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: err.message || 'An unknown error occurred. Please check the console.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Preparing your claim request...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-24 text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center text-3xl font-headline">
            <HelpCircle className="mr-3 text-primary" />
            Prove Your Ownership
          </CardTitle>
          <CardDescription>
            Answer the following questions to help the finder verify you are the true owner. Provide concise but clear answers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {questions.map((q, index) => (
                <FormField
                  key={index}
                  control={form.control}
                  name={`answers.question-${index}` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold">{q}</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Your answer..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2" />}
                Submit Claim for Verification
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
