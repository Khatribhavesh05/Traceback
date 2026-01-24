import type { Metadata } from 'next';
import './globals.css';
import { Inter, Source_Code_Pro } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { FirebaseProvider } from '@/components/providers/firebase-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  variable: '--font-source-code-pro',
});

export const metadata: Metadata = {
  title: 'Traceback | A Privacy-First Lost & Found Platform',
  description: 'A modern, reliable Lost & Found web application where users can report lost and found items and see matching results.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={cn(
          'h-full flex flex-col font-body antialiased',
          inter.variable,
          sourceCodePro.variable
        )}
      >
        <FirebaseProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster />
        </FirebaseProvider>
      </body>
    </html>
  );
}
