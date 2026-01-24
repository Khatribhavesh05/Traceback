'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/firebase-provider';
import { useEffect, useState } from 'react';
import {
  doc,
  getDoc,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
  or,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ItemReport, Claim } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generatePin, hashPin } from '@/lib/utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Package, Hourglass, CheckCircle, ShieldAlert, XCircle, Copy, KeyRound, Send, Flag, ArrowRight, Home, UserCheck, ThumbsUp, PackageCheck, Circle, Mail } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [item, setItem] = useState<(ItemReport & { id: string }) | null>(null);
  const [claim, setClaim] = useState<(Claim & { id: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [enteredPin, setEnteredPin] = useState('');

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login');
    }
  }, [isAuthLoading, user, router]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      // The other effect will handle redirect
      return;
    }

    if (!itemId) {
      setError('Item ID is missing.');
      setIsLoading(false);
      return;
    }

    const fetchItemAndClaim = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const itemRef = doc(db, 'items', itemId);
        const itemSnap = await getDoc(itemRef);

        if (!itemSnap.exists()) throw new Error('Item not found.');
        
        const itemData = { id: itemSnap.id, ...itemSnap.data() } as ItemReport & { id: string };
        
        const claimsQuery = query(collection(db, 'claims'), or(where('lostUserId', '==', user.uid), where('foundUserId', '==', user.uid)));
        const claimsSnapshot = await getDocs(claimsQuery);
        
        const relevantClaimDoc = claimsSnapshot.docs.find(doc => {
            const data = doc.data();
            return data.lostItemId === itemId || data.foundItemId === itemId;
        });

        const isOwner = itemData.userId === user.uid;
        if (!isOwner && !relevantClaimDoc) {
          throw new Error("You are not authorized to view this item's details.");
        }
        
        setItem(itemData);

        if (relevantClaimDoc?.exists()) {
          setClaim({ id: relevantClaimDoc.id, ...relevantClaimDoc.data() } as Claim & { id: string });
        }
      } catch (err: any) {
        console.error("Error fetching item/claim details:", err);
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchItemAndClaim();
  }, [itemId, user, isAuthLoading, router]);

  const handleGeneratePin = async () => {
    if (!claim || !user || user.uid !== claim.lostUserId) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'Only the item owner can generate a PIN.' });
      return;
    }
    setIsSubmitting(true);
    console.log('Attempting to generate PIN for claim:', claim.id);
    try {
      const pin = generatePin();
      const pinHash = await hashPin(pin);
      const pinLast4 = pin.slice(-4);

      const claimRef = doc(db, 'claims', claim.id);
      await updateDoc(claimRef, {
        handoverPinHash: pinHash,
        handoverPinLast4: pinLast4,
        pinGeneratedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log('Successfully updated claim with PIN hash.');
      
      const updatedClaim = (await getDoc(claimRef)).data() as Claim;
      setClaim({ ...updatedClaim, id: claim.id });
      setGeneratedPin(pin);


      toast({ title: 'PIN Generated Successfully', description: 'Share this PIN with the finder for verification.' });
    } catch (error: any) {
      console.error('Error generating PIN:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error Generating PIN', 
        description: error.message || 'Could not update claim. Please check permissions and try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleConfirmHandover = async () => {
    if (!claim || !user || user.uid !== claim.foundUserId || enteredPin.length !== 6) {
      toast({ variant: 'destructive', title: 'Invalid PIN', description: 'Please enter the 6-digit PIN provided by the owner.' });
      return;
    }
    setIsSubmitting(true);

    try {
      const latestClaimSnap = await getDoc(doc(db, 'claims', claim.id));
      if (!latestClaimSnap.exists() || !latestClaimSnap.data().handoverPinHash) {
         throw new Error('PIN has not been generated for this claim yet.');
      }
      
      const storedPinHash = latestClaimSnap.data().handoverPinHash;
      const enteredPinHash = await hashPin(enteredPin);

      if (enteredPinHash !== storedPinHash) {
        console.error('PIN Mismatch:', { entered: enteredPinHash, stored: storedPinHash });
        toast({ variant: 'destructive', title: 'Incorrect PIN', description: 'The PIN does not match. Please ask the owner for the correct PIN.' });
        setIsSubmitting(false);
        return;
      }
      
      const claimRef = doc(db, 'claims', claim.id);
      await updateDoc(claimRef, {
          status: 'closed',
          finderConfirmed: true,
          closedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
      });


      toast({ title: 'Handover Confirmed!', description: 'The item has been successfully returned.' });

      const updatedClaim = (await getDoc(claimRef)).data() as Claim;
      setClaim({ ...updatedClaim, id: claim.id });
      setItem(prev => prev ? { ...prev, status: 'closed' } : null);

    } catch (error: any) {
      console.error("PIN Confirmation Failed:", error);
      toast({ variant: 'destructive', title: 'Confirmation Failed', description: error.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispute = async () => {
    if (!claim) return;
    setIsSubmitting(true);
    try {
      const claimRef = doc(db, 'claims', claim.id);
      await updateDoc(claimRef, { status: 'disputed', disputeStatus: 'reported', updatedAt: serverTimestamp() });
      setClaim(prev => prev ? { ...prev, status: 'disputed' } : null);
      toast({ title: 'Dispute Reported', description: 'The case is on hold. We will review and contact you.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: 'Could not report a dispute.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getDerivedStatus = () => {
    if (claim?.status === 'closed' || item?.status === 'closed') return 'closed';
    if (claim?.status === 'disputed') return 'disputed';
    if (claim?.handoverPinHash) return 'pin_generated';
    if (claim?.status === 'approved') return 'approved';
    if (claim?.status === 'pending') return 'pending';
    return 'open';
  }

  const renderProgressTimeline = () => {
    if (!claim) {
      return null;
    }

    const steps = [
      {
        name: 'Claim Submitted',
        isCompleted: !!claim.createdAt,
        timestamp: claim.createdAt ? (claim.createdAt as Timestamp).toDate() : null,
        icon: Mail,
      },
      {
        name: 'Claim Approved',
        isCompleted: claim.status === 'approved' || claim.status === 'closed' || !!claim.handoverPinHash,
        timestamp: claim.approvedAt ? (claim.approvedAt as Timestamp).toDate() : null,
        icon: ThumbsUp,
      },
      {
        name: 'PIN Generated',
        isCompleted: !!claim.handoverPinHash,
        timestamp: claim.pinGeneratedAt ? (claim.pinGeneratedAt as Timestamp).toDate() : null,
        icon: KeyRound,
      },
      {
        name: 'Item Returned',
        isCompleted: claim.status === 'closed',
        timestamp: claim.closedAt ? (claim.closedAt as Timestamp).toDate() : null,
        icon: PackageCheck,
      },
    ];

    return (
      <Card>
        <CardHeader>
          <CardTitle>Claim Progress</CardTitle>
          <CardDescription>Track the status of your claim from submission to resolution.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex flex-col items-center h-full">
                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full',
                      step.isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted border'
                    )}
                  >
                    <step.icon className="w-5 h-5" />
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'w-px flex-grow mt-2',
                        steps[index + 1].isCompleted ? 'bg-primary' : 'bg-border'
                      )}
                    />
                  )}
                </div>
                <div className={cn("pb-8", {'flex-grow': index === steps.length - 1})}>
                  <p
                    className={cn(
                      'font-semibold',
                      step.isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {step.name}
                  </p>
                  {step.isCompleted && step.timestamp && (
                    <p className="text-sm text-muted-foreground">
                      {format(step.timestamp, 'PPP @ p')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };


  const renderClaimStatus = () => {
    if (!claim && item?.type === 'lost') {
        return (
          <Alert>
            <Home className="h-4 w-4" />
            <AlertTitle>This is your lost item report.</AlertTitle>
            <AlertDescription>
                When a match is found and claimed, you can manage the handover here. Go to {' '}
                <Link href="/dashboard" className="font-bold underline">your dashboard</Link> to view potential matches.
            </AlertDescription>
          </Alert>
        );
    }
    if (!claim) {
      return <Alert><Package className="h-4 w-4" /><AlertTitle>Item is Open</AlertTitle><AlertDescription>This item has not yet been claimed.</AlertDescription></Alert>;
    }
    
    const isOwner = user?.uid === claim.lostUserId;
    const isFinder = user?.uid === claim.foundUserId;
    const status = getDerivedStatus();

    switch (status) {
      case 'pending':
        return (
          <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-800 [&>svg]:text-yellow-700">
            <Hourglass className="h-4 w-4" />
            <AlertTitle>Claim Awaiting Review</AlertTitle>
            <AlertDescription>
              {isOwner ? 'Your claim is being reviewed by the finder.' : <>You have a pending claim to review. <Link href={`/claim/review/${claim.id}`} className="font-bold underline">Review it now.</Link></>}
            </AlertDescription>
          </Alert>
        );
      case 'approved':
      case 'pin_generated':
        return (
          <Card className="bg-background">
            <CardHeader>
              <CardTitle className="text-green-700">Claim Approved - Ready for Handover</CardTitle>
              <CardDescription>Coordinate the pickup using the secure PIN system below. The user who lost the item generates the PIN.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isOwner && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
                  <h4 className="font-semibold text-blue-800">Your Role: Generate PIN</h4>
                  {!claim.handoverPinHash && !generatedPin ? (
                    <Button onClick={handleGeneratePin} disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <KeyRound className="mr-2" />}
                      Generate Secure Pickup PIN
                    </Button>
                  ) : (
                    <>
                      <p className="text-sm text-blue-700">Share this PIN with the finder only at the time of pickup. {generatedPin ? <b>It will not be shown again.</b> : ""}</p>
                      <div className="flex items-center gap-4">
                        <p className="text-3xl font-bold tracking-widest text-blue-900 font-code bg-white px-4 py-2 rounded-md shadow-inner">
                          {generatedPin ? generatedPin : `••••${claim.handoverPinLast4}`}
                        </p>
                        {generatedPin && (
                          <Button size="sm" variant="outline" onClick={() => {
                            navigator.clipboard.writeText(generatedPin);
                            toast({ title: "PIN Copied!" });
                          }}>
                            <Copy className="w-4 h-4 mr-2" /> Copy
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
              {isFinder && (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 space-y-3">
                  <h4 className="font-semibold text-green-800">Your Role: Verify PIN</h4>
                  {!claim.handoverPinHash ? (
                     <p className="text-muted-foreground">Waiting for the owner to generate the pickup PIN.</p>
                  ) : (
                    <>
                      <p className="text-muted-foreground">Enter the 6-digit PIN from the owner to confirm you have returned the item.</p>
                      <div className="flex items-center gap-2">
                        <Input placeholder="Enter 6-digit PIN" maxLength={6} value={enteredPin} onChange={(e) => setEnteredPin(e.target.value)} className="font-code tracking-widest" />
                        <Button onClick={handleConfirmHandover} disabled={isSubmitting || enteredPin.length !== 6}>
                          {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
                          Confirm & Close
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
            {status !== 'closed' && (
              <CardFooter>
                  <Button variant="outline" size="sm" onClick={handleDispute} disabled={isSubmitting}>
                      <Flag className="mr-2" /> Report a Dispute
                  </Button>
              </CardFooter>
            )}
          </Card>
        );
      case 'rejected':
        return <Alert variant="destructive"><XCircle className="h-4 w-4" /><AlertTitle>Claim Rejected</AlertTitle><AlertDescription>The finder has rejected this claim.</AlertDescription></Alert>;
      case 'disputed':
        return <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Dispute in Progress</AlertTitle><AlertDescription>This case is on hold pending a review from our team.</AlertDescription></Alert>;
      case 'closed':
        return <Alert className="bg-blue-50 border-blue-200 text-blue-800 [&>svg]:text-blue-700"><CheckCircle className="h-4 w-4" /><AlertTitle>Item Returned</AlertTitle><AlertDescription>This case is closed. Thank you for Traceback!</AlertDescription></Alert>;
      default:
         return null;
    }
  };

  if (isLoading || isAuthLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  }

  if (error || !item) {
    return (
      <div className="container py-24 text-center">
        <AlertTriangle className="w-16 h-16 mx-auto text-destructive" /><h2 className="mt-4 text-2xl font-bold">Error</h2><p className="text-muted-foreground">{error || 'Could not load item details.'}</p>
      </div>
    );
  }
  
  const effectiveStatus = claim?.status || item.status;
  const isParticipant = user?.uid === claim?.lostUserId || user?.uid === claim?.foundUserId;
  const canShowContact = isParticipant && claim?.contactExchange && (claim.status === 'approved' || claim.status === 'closed');

  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
           <div className="flex items-center justify-between">
             <h1 className="text-4xl font-bold tracking-tight font-headline capitalize">{item.category}</h1>
             {effectiveStatus === 'closed' && <Badge variant="default" className="text-lg py-1 px-3 bg-blue-600">Returned</Badge>}
           </div>
          <p className="text-muted-foreground mt-1">Reported as <span className="font-semibold">{item.type}</span> on {item.createdAt ? format((item.createdAt as Timestamp).toDate(), 'PPP') : 'N/A'}</p>
        </div>
        <Card>
          {item.imageUrl && (
            <CardHeader>
              <div className="relative w-full h-64 overflow-hidden rounded-lg">
                <Image src={item.imageUrl} alt={item.description} fill style={{objectFit: 'cover'}} />
              </div>
            </CardHeader>
          )}
          <CardContent className={item.imageUrl ? 'pt-6' : ''}>
            <div className="space-y-4">
              <div><p className="font-semibold">Description</p><p>{item.description}</p></div>
              <div><p className="font-semibold">Location</p><p>{item.location}</p></div>
              <div><p className="font-semibold">Date</p><p>{format((item.date as unknown as Timestamp).toDate(), 'PPP')}</p></div>
            </div>
          </CardContent>
        </Card>
        
        {canShowContact && (
            <>
                <Separator />
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCheck />
                            Contact Details for Handover
                        </CardTitle>
                        <CardDescription>
                            You can now coordinate the handover with the other party.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                            <h4 className="font-semibold text-blue-800">Owner (Lost Item)</h4>
                            <p className="text-foreground"><strong>Name:</strong> {claim.contactExchange.lostUser.name}</p>
                            <p className="text-foreground"><strong>Contact:</strong> {claim.contactExchange.lostUser.contact}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                            <h4 className="font-semibold text-green-800">Finder (Found Item)</h4>
                            <p className="text-foreground"><strong>Name:</strong> {claim.contactExchange.foundUser.name}</p>
                            <p className="text-foreground"><strong>Contact:</strong> {claim.contactExchange.foundUser.contact}</p>
                        </div>
                    </CardContent>
                </Card>
            </>
        )}

        {isParticipant && claim && <Separator />}

        {isParticipant && renderProgressTimeline()}

        <Separator />
        {renderClaimStatus()}
      </div>
    </div>
  );
}
