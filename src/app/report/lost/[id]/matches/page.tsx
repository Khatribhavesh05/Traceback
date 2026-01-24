'use client';

import MatchResults from '@/components/matches/match-results';
import NoMatches from '@/components/matches/no-matches';
import { db } from '@/lib/firebase';
import { ItemReport, MatchResult, Claim } from '@/lib/types';
import { improveMatchingWithAi } from '@/ai/flows/improve-matching-with-ai';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { AlertTriangle, Glasses } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/providers/firebase-provider';
import { useRouter, useParams } from 'next/navigation';

async function getLostItem(id: string): Promise<ItemReport | null> {
  const docRef = doc(db, 'items', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists() || docSnap.data().type !== 'lost') {
    return null;
  }
  const data = docSnap.data();
  return {
    ...(data as Omit<ItemReport, 'date' | 'createdAt'>),
    id: docSnap.id,
    date: (data.date as Timestamp).toDate(),
    createdAt: (data.createdAt as Timestamp)?.toDate(),
  };
}

async function findPotentialMatches(
  lostItem: ItemReport
): Promise<MatchResult[]> {
  const normalizedCategory = lostItem.category.toLowerCase().trim();

  const foundItemsQuery = query(
    collection(db, 'items'),
    where('type', '==', 'found'),
    where('category', '==', normalizedCategory),
    orderBy('date', 'desc'),
    limit(50)
  );

  const querySnapshot = await getDocs(foundItemsQuery);
  if (querySnapshot.empty) {
    return [];
  }

  // Filter for 'open' status in-memory to avoid complex index issues
  const openItems = querySnapshot.docs.filter(doc => doc.data().status === 'open');

  const potentialDocs = openItems.map((doc) => {
    const data = doc.data();
    return {
      ...(data as Omit<ItemReport, 'date' | 'createdAt'>),
      id: doc.id,
      date: (data.date as Timestamp).toDate(),
      createdAt: (data.createdAt as Timestamp)?.toDate(),
    };
  });

  const matchPromises = potentialDocs.map(async (foundItem) => {
    try {
      if (!lostItem.description || !foundItem.description) {
        return null;
      }

      const result = await improveMatchingWithAi({
        lostItemDescription: lostItem.description,
        foundItemDescription: foundItem.description,
        lostItemImageDataUri: lostItem.imageUrl,
        foundItemImageDataUri: foundItem.imageUrl,
      });

      if (result.matchProbability > 0.3) {
        return {
          id: foundItem.id,
          score: result.matchProbability,
          reason: result.reason,
          item: foundItem,
        };
      }
    } catch (error) {
      console.error(`AI matching failed for item ${foundItem.id}:`, error);
    }
    return null;
  });

  const results = await Promise.all(matchPromises);
  const validMatches = results.filter(
    (result): result is MatchResult => result !== null
  );

  return validMatches.sort((a, b) => b.score - a.score);
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/4 mt-2" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function MatchesPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [lostItem, setLostItem] = useState<ItemReport | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [claims, setClaims] = useState<Map<string, Claim>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }
    if (!user) {
      router.replace('/login');
      return;
    }

    if (!id) {
      return;
    }

    const fetchItemAndMatches = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const item = await getLostItem(id);

        if (!item) {
          setError(
            'The report you are looking for does not exist or is invalid.'
          );
          setIsLoading(false);
          return;
        }

        if (item.userId !== user.uid) {
          setError('You are not authorized to view these matches.');
          setIsLoading(false);
          return;
        }

        setLostItem(item);

        const potentialMatches = await findPotentialMatches(item);
        setMatches(potentialMatches);

        if (potentialMatches.length > 0) {
          const claimsQuery = query(
            collection(db, 'claims'),
            where('lostUserId', '==', user.uid),
            where('lostItemId', '==', id)
          );
          const claimsSnapshot = await getDocs(claimsQuery);
          const claimsMap = new Map<string, Claim>();
          claimsSnapshot.forEach(doc => {
              const claim = { id: doc.id, ...doc.data() } as Claim;
              claimsMap.set(claim.foundItemId, claim);
          });
          setClaims(claimsMap);
        }
      } catch (e: any) {
        console.error(e);
        if (e.code === 'permission-denied') {
          setError('You do not have permission to view this item.');
        } else {
          setError('An error occurred while fetching matches.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchItemAndMatches();
  }, [user, isAuthLoading, id, router]);

  if (isLoading || isAuthLoading) {
    return (
      <div className="container py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <Glasses className="w-12 h-12 mx-auto text-primary" />
            <h1 className="mt-4 text-4xl font-bold tracking-tight font-headline">
              Finding Potential Matches
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Please wait while we search our database...
            </p>
          </div>
          <div className="mt-12">
            <LoadingSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-24 text-center">
        <AlertTriangle className="w-16 h-16 mx-auto text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">Error</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!lostItem) {
    return (
      <div className="container py-24 text-center">
        <AlertTriangle className="w-16 h-16 mx-auto text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">Lost Item Not Found</h1>
        <p className="text-muted-foreground">
          The report you are looking for does not exist or is invalid.
        </p>
      </div>
    );
  }

  const serializableLostItem = {
    ...lostItem,
    date: lostItem.date.toISOString(),
    createdAt:
      lostItem.createdAt instanceof Date
        ? lostItem.createdAt.toISOString()
        : new Date().toISOString(),
  };

  const serializableMatches = matches.map((match) => ({
    ...match,
    item: {
      ...match.item,
      date:
        match.item.date instanceof Date
          ? match.item.date.toISOString()
          : new Date().toISOString(),
      createdAt:
        match.item.createdAt instanceof Date
          ? match.item.createdAt.toISOString()
          : new Date().toISOString(),
    },
  }));

  return (
    <div className="container py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <Glasses className="w-12 h-12 mx-auto text-primary" />
          <h1 className="mt-4 text-4xl font-bold tracking-tight font-headline">
            Potential Matches Found
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            We&apos;ve searched our database for items that match your lost report.
          </p>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Your Lost Item</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              <strong>Category:</strong> {serializableLostItem.category}
            </p>
            <p>
              <strong>Description:</strong> {serializableLostItem.description}
            </p>
          </CardContent>
        </Card>

        <h2 className="mt-12 mb-6 text-2xl font-bold text-center font-headline">
          Matching Found Items
        </h2>

        {matches.length === 0 ? (
          <NoMatches />
        ) : (
          <MatchResults matches={serializableMatches as any} lostItem={serializableLostItem as any} claims={claims} />
        )}
      </div>
    </div>
  );
}
