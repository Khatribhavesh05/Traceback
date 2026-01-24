'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/firebase-provider';
import { doc, getDoc, Timestamp, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Claim, ItemReport } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, User, Check, X, AlertTriangle, Handshake, CheckCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

async function getClaimAndItems(claimId: string) {
    const claimRef = doc(db, 'claims', claimId);
    const claimSnap = await getDoc(claimRef);

    if (!claimSnap.exists()) {
        throw new Error('Claim not found.');
    }
    const claim = { id: claimSnap.id, ...claimSnap.data() } as Claim;

    const [lostItemSnap, foundItemSnap] = await Promise.all([
        getDoc(doc(db, 'items', claim.lostItemId)),
        getDoc(doc(db, 'items', claim.foundItemId)),
    ]);
    
    if (!lostItemSnap.exists()) {
        throw new Error('Associated lost item not found.');
    }
    const lostItem = { id: lostItemSnap.id, ...lostItemSnap.data(), date: (lostItemSnap.data().date as Timestamp).toDate() } as ItemReport;
    
    if (!foundItemSnap.exists()) {
        throw new Error('Associated found item not found.');
    }
    const foundItem = { id: foundItemSnap.id, ...foundItemSnap.data(), date: (foundItemSnap.data().date as Timestamp).toDate() } as ItemReport;

    return { claim, lostItem, foundItem };
}

export default function ClaimReviewPage() {
    const params = useParams<{ claimId: string }>();
    const { claimId } = params;
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [claim, setClaim] = useState<Claim | null>(null);
    const [lostItem, setLostItem] = useState<ItemReport | null>(null);
    const [foundItem, setFoundItem] = useState<ItemReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        if (isAuthLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }

        const fetchClaim = async () => {
            setIsLoading(true);
            try {
                const { claim, lostItem, foundItem } = await getClaimAndItems(claimId);
                
                if (user.uid !== claim.foundUserId && user.uid !== claim.lostUserId) {
                    throw new Error("You are not authorized to view this claim.");
                }
                
                setClaim(claim);
                setLostItem(lostItem);
                setFoundItem(foundItem);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchClaim();
    }, [claimId, user, isAuthLoading, router]);

    const handleDecision = async (decision: 'approved' | 'rejected') => {
        if (!user || !claim || !lostItem || !foundItem) return;
        
        if (user.uid !== claim.foundUserId) {
            toast({
                variant: 'destructive',
                title: 'Not Authorized',
                description: 'Only the user who found the item can take action on a claim.',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const claimRef = doc(db, 'claims', claimId);

            const updateData: { [key: string]: any } = {
                status: decision,
                updatedAt: serverTimestamp(),
            };

            if (decision === 'approved') {
              updateData.approvedAt = serverTimestamp();
              updateData.contactExchange = {
                lostUser: {
                    name: lostItem.name,
                    contact: lostItem.contact,
                },
                foundUser: {
                    name: foundItem.name,
                    contact: foundItem.contact,
                }
              };
              const foundItemRef = doc(db, 'items', claim.foundItemId);
              batch.update(foundItemRef, { status: 'claimed' });
            }
            if (decision === 'rejected') {
              updateData.rejectedAt = serverTimestamp();
            }
            
            batch.update(claimRef, updateData);
            await batch.commit();
            
            toast({
                title: `Claim ${decision}!`,
                description: decision === 'approved' ? "Contact details have been exchanged. Proceed to the handover page." : "The claim has been rejected.",
            });

            // Re-fetch the claim to update the UI with the new status
            const { claim: updatedClaim } = await getClaimAndItems(claimId);
            setClaim(updatedClaim);
        } catch (err: any) {
            console.error("Claim review failed:", err);
            toast({ variant: 'destructive', title: 'Action Failed', description: err.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoading || isAuthLoading) {
        return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
    }

    if (error) {
        return <div className="container py-24 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto text-destructive" /><h2 className="mt-4 text-2xl font-bold">Error</h2><p className="text-muted-foreground">{error}</p>
        </div>;
    }

    if (!claim || !lostItem) return null;
    
    const { status } = claim;
    const isFinder = user?.uid === claim.foundUserId;

    let badgeVariant: 'default' | 'secondary' | 'destructive' = 'secondary';
    if (status === 'approved' || status === 'closed') {
        badgeVariant = 'default';
    } else if (status === 'rejected') {
        badgeVariant = 'destructive';
    }


    return (
        <div className="container py-12">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <div className="flex items-center justify-between">
                         <CardTitle className="text-3xl font-headline">Review Ownership Claim</CardTitle>
                         <Badge variant={badgeVariant} className="capitalize text-lg py-1 px-3">{status}</Badge>
                    </div>
                    <CardDescription>
                        A user claims they own the item you found. Review their answers to verify their claim.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="mb-2 text-lg font-semibold">Claimant&apos;s Answers</h3>
                        <div className="p-4 space-y-4 border rounded-md bg-muted/50">
                            {claim.questionsAndAnswers && claim.questionsAndAnswers.map((qa, index) => (
                                <div key={index}>
                                    <p className="font-semibold text-foreground">{qa.question}</p>
                                    <p className="mt-1 text-muted-foreground">{qa.answer}</p>
                                    {index < claim.questionsAndAnswers.length - 1 && <Separator className="mt-4" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {status === 'approved' && (
                         <div className="p-6 rounded-md bg-green-50 border border-green-200 text-green-800 space-y-4">
                            <div className="flex items-center gap-4">
                              <CheckCircle className="w-8 h-8 text-green-600"/>
                              <div>
                                <h4 className="font-semibold text-lg">Claim Approved!</h4>
                                <p>Contact details have been shared. You can now proceed to the handover page.</p>
                              </div>
                            </div>
                            <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                                <Link href={`/item/${claim.lostItemId}`}>
                                    Go to Handover Page <ArrowRight className="ml-2"/>
                                </Link>
                            </Button>
                         </div>
                    )}
                    {status === 'closed' && (
                        <div className="p-4 text-center rounded-md bg-blue-50 border border-blue-200 text-blue-800">
                            <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                            <h4 className="font-semibold">Case Closed</h4>
                            <p className="text-sm">This item has been successfully returned.</p>
                        </div>
                    )}
                </CardContent>
                {status === 'pending' && isFinder && (
                     <CardFooter className="flex items-center justify-end p-6 bg-secondary/50 gap-4">
                        <Button variant="destructive" onClick={() => handleDecision('rejected')} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <X className="mr-2" />} Reject
                        </Button>
                        <Button onClick={() => handleDecision('approved')} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <Check className="mr-2" />} Approve
                        </Button>
                    </CardFooter>
                )}
                {status === 'pending' && !isFinder && (
                     <CardFooter className="p-6">
                        <Alert>
                          <AlertTitle>Pending Review</AlertTitle>
                          <AlertDescription>
                            Waiting for the finder to review and approve this claim.
                          </AlertDescription>
                        </Alert>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
