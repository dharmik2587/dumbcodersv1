import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/client/lib/theme';
import NextTopLoader from 'nextjs-toploader';
import { GuestAuthProvider } from '@/components/shared/GuestAuthModal';
import { constructMetadata, getBaseUrl } from '@/lib/seo/metadata';

export const metadata: Metadata = constructMetadata();

export const viewport: Viewport = {
  themeColor: '#0a0a0c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const baseUrl = getBaseUrl();

  const organizationAndWebsiteSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'HackMate',
        url: baseUrl,
        logo: `${baseUrl}/favicon.ico`,
        sameAs: [
          'https://github.com/dharmik2587/dumbcodersv1',
        ],
        description:
          'Find complementary teammates for college hackathons, analyze team role coverage, and collaborate with verified GitHub & LeetCode builders.',
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: 'HackMate',
        publisher: {
          '@id': `${baseUrl}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/hackathons?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationAndWebsiteSchema) }}
        />
      </head>
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
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider>
              <GuestAuthProvider>{children}</GuestAuthProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
