'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ItemReport, MatchResult, Claim } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { MessageCircle, Percent, User, Calendar, MapPin, Mail, Phone, Hourglass, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { Progress } from '../ui/progress';
import Link from 'next/link';

type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'none';

function getClaimStatus(claim: Claim | undefined): ClaimStatus {
    if (!claim) return 'none';
    if (claim.status === 'rejected') return 'rejected';
    if (claim.status === 'approved' || claim.status === 'closed') return 'approved'; // Treat closed as approved for display
    if (claim.status === 'pending') return 'pending';
    return 'none';
}


function ClaimStatusDisplay({ status, lostItemId, foundItemId }: { status: ClaimStatus, lostItemId: string, foundItemId: string }) {
  switch (status) {
    case 'pending':
      return <Button disabled variant="secondary"><Hourglass className="mr-2" />Claim Pending</Button>;
    case 'rejected':
      return <Badge variant="destructive" className="text-base"><XCircle className="mr-2" />Claim Rejected</Badge>;
    case 'approved':
       return (
         <div className="flex flex-col items-start gap-2">
            <Badge className="text-base bg-green-100 text-green-800 border-green-200 hover:bg-green-100"><CheckCircle className="mr-2" />Claim Approved</Badge>
            <Button asChild size="sm">
              <Link href={`/item/${lostItemId}`}>
                Proceed to Handover <ArrowRight className="ml-2" />
              </Link>
            </Button>
         </div>
       );
    case 'none':
    default:
      return (
        <Button asChild>
          <Link href={`/claim/request/${lostItemId}/${foundItemId}`}>
            Request Claim
          </Link>
        </Button>
      );
  }
}


export default function MatchCard({ match, lostItem, claim }: { match: MatchResult, lostItem: ItemReport, claim?: Claim }) {
  const [formattedDate, setFormattedDate] = useState('');
  
  const scorePercentage = Math.round(match.score * 100);
  const claimStatus = getClaimStatus(claim);

  useEffect(() => {
    if (match.item.date) {
        const itemDate = new Date(match.item.date);
        setFormattedDate(format(itemDate, 'PPP'));
    }
  }, [match.item.date]);


  const getBadgeVariant = (score: number) => {
    if (score > 0.8) return 'default';
    if (score > 0.5) return 'secondary';
    return 'outline';
  };

  return (
    <Card className="overflow-hidden transition-all duration-300 shadow-lg hover:shadow-xl">
      <CardHeader className="p-0">
        {match.item.imageUrl && (
            <div className="relative w-full h-48">
                <Image src={match.item.imageUrl} alt={match.item.description} fill className="object-cover" />
            </div>
        )}
      </CardHeader>
      <div className="p-6">
      <CardTitle className="flex items-center justify-between">
        <span>Match Found: {match.item.category}</span>
        <Badge variant={getBadgeVariant(match.score)} className="text-sm">
          <Percent className="w-4 h-4 mr-1" />
          {scorePercentage}% Match
        </Badge>
      </CardTitle>
      <div className="w-full my-2">
        <Progress value={scorePercentage} className="h-2" />
      </div>
      <CardDescription className="flex items-center gap-2 mt-2 text-sm">
        <MessageCircle className="w-4 h-4" />
        <span className="font-semibold">AI Reason:</span> {match.reason}
      </CardDescription>
      <CardContent className="px-0 pt-6 pb-0">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 mt-1 text-muted-foreground" />
                <div>
                    <p className="font-semibold">Date Found</p>
                    <p className="text-muted-foreground">{formattedDate || 'Loading date...'}</p>
                </div>
            </div>
            <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 mt-1 text-muted-foreground" />
                <div>
                    <p className="font-semibold">Location Found</p>
                    <p className="text-muted-foreground">{match.item.location}</p>
                </div>
            </div>
        </div>
        <p className="mt-4 text-sm text-foreground">{match.item.description}</p>
      </CardContent>
      <CardFooter className="flex-col items-start px-0 pt-6 pb-0">
          <ClaimStatusDisplay status={claimStatus} lostItemId={lostItem.id!} foundItemId={match.item.id!} />
      </CardFooter>
      </div>
    </Card>
  );
}
