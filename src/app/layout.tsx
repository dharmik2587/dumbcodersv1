import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/client/lib/theme';
import NextTopLoader from 'nextjs-toploader';

import { GuestAuthProvider } from '@/components/shared/GuestAuthModal';

export const metadata: Metadata = {
  title: {
    default: 'HackMate · Beta',
    template: '%s | HackMate',
  },
  description: 'Find the right teammates for your next hackathon. Built by students, for students.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <NextTopLoader
          color="var(--accent)"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px var(--accent),0 0 5px var(--accent)"
        />
        <AuthProvider>
          <QueryProvider>
            <ThemeProvider>
              <GuestAuthProvider>{children}</GuestAuthProvider>
            </ThemeProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

