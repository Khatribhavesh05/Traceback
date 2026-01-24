'use client';

import { useAuth } from '@/components/providers/firebase-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  or,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ItemReport, Claim } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, PackageSearch, CheckCircle, List, ThumbsUp, AlertTriangle, Hourglass, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

type ItemWithId = ItemReport & { id: string };
type ClaimWithId = Claim & { id: string };

type DerivedStatus = 'open' | 'pending' | 'approved' | 'rejected' | 'disputed' | 'closed' | 'claimed';

export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allItems, setAllItems] = useState<ItemWithId[]>([]);
  const [claimsMap, setClaimsMap] = useState<Map<string, ClaimWithId>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const itemsQuery = query(
        collection(db, 'items'),
        where('userId', '==', user.uid)
      );
      const itemsSnapshot = await getDocs(itemsQuery);
      const userItems = itemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as ItemReport),
      })) as ItemWithId[];

      userItems.sort((a, b) => {
        const bSeconds = (b.createdAt as Timestamp)?.seconds || 0;
        const aSeconds = (a.createdAt as Timestamp)?.seconds || 0;
        return bSeconds - aSeconds;
      });
      setAllItems(userItems);

      if (userItems.length > 0) {
        const newClaimsMap = new Map<string, ClaimWithId>();
        const claimsQuery = query(collection(db, 'claims'), or(
          where('lostUserId', '==', user.uid),
          where('foundUserId', '==', user.uid)
        ));
        const claimsSnap = await getDocs(claimsQuery);
        
        claimsSnap.forEach((doc) => {
            const claim = { id: doc.id, ...doc.data() } as ClaimWithId;
            newClaimsMap.set(claim.lostItemId, claim);
            if (claim.foundItemId) {
                newClaimsMap.set(claim.foundItemId, claim);
            }
        });
        setClaimsMap(newClaimsMap);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch dashboard data.' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login');
    } else if (user) {
      fetchData();
    }
  }, [user, isAuthLoading, router, fetchData]);
  
  const getDerivedStatus = (item: ItemWithId): DerivedStatus => {
    const claim = claimsMap.get(item.id);
    if (item.status === 'closed') return 'closed';
    if (claim) {
        if (claim.status === 'approved' || claim.status === 'closed') {
          return claim.status;
        }
    }
    if (item.status === 'claimed') return 'claimed';
    if (claim) return claim.status as DerivedStatus;

    return item.status as DerivedStatus;
  };

  const renderItemCard = (item: ItemWithId) => {
    const claim = claimsMap.get(item.id);
    const effectiveStatus = getDerivedStatus(item);

    const statusInfo: Record<DerivedStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon?: React.ElementType, text: string }> = {
      open: { variant: 'outline', text: 'Open' },
      pending: { variant: 'secondary', icon: Hourglass, text: 'Claim Pending' },
      claimed: { variant: 'secondary', icon: Hourglass, text: 'Claimed' },
      approved: { variant: 'default', icon: ThumbsUp, text: 'Claim Approved' },
      rejected: { variant: 'destructive', text: 'Claim Rejected' },
      closed: { variant: 'default', icon: CheckCircle, text: 'Resolved' },
      disputed: { variant: 'destructive', icon: AlertTriangle, text: 'Disputed' }
    };
    
    const { variant, text, icon: Icon } = statusInfo[effectiveStatus] || statusInfo.open;
    const isClosed = effectiveStatus === 'closed';

    let link = `/item/${item.id}`;
    let linkText = 'View Details';
    
    if (item.type === 'lost') {
      if (effectiveStatus === 'open') {
        link = `/report/lost/${item.id}/matches`;
        linkText = 'View Matches';
      } else if (effectiveStatus === 'approved' || effectiveStatus === 'claimed') {
        link = `/item/${item.id}`;
        linkText = 'Proceed to Handover';
      }
    } else if (item.type === 'found') {
       if (effectiveStatus === 'pending' && claim) {
        link = `/claim/review/${claim.id}`;
        linkText = 'Review Claim';
      } else if (effectiveStatus === 'approved' || effectiveStatus === 'claimed') {
        link = `/item/${item.id}`;
        linkText = 'Proceed to Handover';
      }
    }


    return (
      <Card key={item.id} className={isClosed ? 'bg-muted/50' : ''}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="capitalize">{item.category}</CardTitle>
            <Badge variant={item.type === 'lost' ? 'destructive' : 'secondary'}>{item.type}</Badge>
          </div>
          <CardDescription>
            Reported on {item.createdAt ? format((item.createdAt as Timestamp).toDate(), 'PPP') : 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-2">{item.description}</p>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <Badge variant={variant} className="capitalize">
             {Icon && <Icon className="mr-2 h-4 w-4" />}
             {text}
          </Badge>
          {!isClosed && (
            <Button asChild size="sm">
              <Link href={link}>
                {linkText}
                {linkText === "View Matches" ? <List className="ml-2 h-4 w-4" /> : <ArrowRight className="ml-2 h-4 w-4" />}
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  if (isAuthLoading || isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  }
  
  const activeItems = allItems.filter(item => getDerivedStatus(item) !== 'closed');
  const closedItems = allItems.filter(item => getDerivedStatus(item) === 'closed');

  return (
    <div className="container py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Your Dashboard</h1>
        <p className="mt-2 text-muted-foreground">View and manage all your reported items.</p>

        <section className="mt-8">
          <h2 className="flex items-center mb-4 text-2xl font-semibold font-headline">
            <PackageSearch className="mr-3 text-primary" />
            Active Items
          </h2>
          {activeItems.length === 0 ? (
            <Card className="text-center"><CardHeader><CardTitle>No Active Items</CardTitle><CardDescription>You have no open or pending reports.</CardDescription></CardHeader></Card>
          ) : (
            <div className="space-y-4">{activeItems.map(renderItemCard)}</div>
          )}
        </section>

        {closedItems.length > 0 && (
          <section className="mt-12">
             <Separator className="my-8"/>
             <h2 className="flex items-center mb-4 text-2xl font-semibold font-headline">
                <CheckCircle className="mr-3 text-muted-foreground" />
                Resolved Items
             </h2>
             <div className="space-y-4">{closedItems.map(renderItemCard)}</div>
          </section>
        )}
      </div>
    </div>
  );
}
