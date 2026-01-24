import { Button } from '@/components/ui/button';
import { ArrowRight, Box, HandHeart } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 text-center bg-background">
      <div className="w-full max-w-4xl mx-auto">
        <section className="py-20 md:py-32">
          <div className="container px-4 mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl font-headline">
                Lost something? Find it with Traceback.
              </h1>
              <p className="mt-4 text-lg md:text-xl text-muted-foreground">
                The privacy-first lost & found platform.
              </p>
              <div className="flex flex-col justify-center gap-4 mt-8 sm:flex-row">
                <Button asChild size="lg" className="font-semibold">
                  <Link href="/report/lost">
                    <Box className="mr-2" />
                    I Lost Something
                    <ArrowRight className="ml-2" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="font-semibold"
                >
                  <Link href="/report/found">
                    <HandHeart className="mr-2" />I Found Something
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
