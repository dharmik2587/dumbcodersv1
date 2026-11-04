import type { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/seo/metadata';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/hackathons',
          '/hackathons/*',
          '/builders',
          '/b/*',
          '/about',
          '/contact',
          '/privacy',
          '/terms',
          '/careers',
          '/changelog',
          '/campus-reps',
          '/leaderboard',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/onboarding/',
          '/settings/',
          '/messages/',
          '/teams/',
          '/requests/',
          '/bookmarks/',
          '/availability/',
          '/sign-in',
          '/sign-up',
          '/reset-password',
          '/matching',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
