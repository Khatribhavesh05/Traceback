'use client';

import { ScanSearch, User, LogOut, Home } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../providers/firebase-provider';
import { Button } from '../ui/button';
import { auth } from '@/lib/firebase';
import { Skeleton } from '../ui/skeleton';

export default function Header() {
  const { user, isLoading } = useAuth();

  const handleLogout = async () => {
    await auth.signOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex items-center h-14 max-w-screen-2xl">
        <Link href="/" className="flex items-center gap-2 mr-6">
          <ScanSearch className="w-6 h-6 text-primary" />
          <span className="text-lg font-bold font-headline">Traceback</span>
        </Link>
        <div className="flex items-center gap-4 ml-auto">
          {isLoading ? (
            <Skeleton className="w-24 h-8" />
          ) : user ? (
            <>
              <Button asChild variant="ghost">
                <Link href="/">
                  <Home className="mr-2" />
                  Home
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/dashboard">
                  <User className="mr-2" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
