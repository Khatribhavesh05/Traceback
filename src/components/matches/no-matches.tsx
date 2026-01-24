import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchX } from 'lucide-react';

export default function NoMatches() {
  return (
    <Card className="w-full text-center">
      <CardHeader>
        <div className="flex justify-center">
            <SearchX className="w-12 h-12 text-muted-foreground" />
        </div>
        <CardTitle className="mt-4">No Matches Found Yet</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          We couldn&apos;t find any items in our database that match your report at the moment.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Don&apos;t worry, we&apos;ll keep your report active. New items are added all the time, so please check back later.
        </p>
      </CardContent>
    </Card>
  );
}
