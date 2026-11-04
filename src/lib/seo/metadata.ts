import type { Metadata } from 'next';

export const APP_NAME = 'HackMate';
export const APP_SLOGAN = 'Find College Hackathon Teammates & Build Winning Teams';
export const DEFAULT_DESCRIPTION =
  'HackMate connects ambitious student developers, designers, and AI builders with complementary skills to form winning hackathon teams. Discover live collegiate hackathons from Devfolio and Unstop.';

export const DEFAULT_KEYWORDS = [
  'hackathon teammates',
  'hackathon team finder',
  'find college hackathon team',
  'college hackathons India',
  'student developers',
  'devfolio hackathons',
  'unstop hackathons',
  'hack2skill hackathons',
  'smart india hackathon teammates',
  'developer collaboration',
  'coding competitions',
  'hackathon matchmaking',
  'leetcode profile verifier',
  'github developer portfolio',
];

export function getBaseUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    (process.env.RENDER_EXTERNAL_URL ? process.env.RENDER_EXTERNAL_URL : undefined);

  if (envUrl) {
    return envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
  }
  return 'https://hackmate.in';
}

export interface ConstructMetadataProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  type?: 'website' | 'article' | 'profile';
  keywords?: string[];
  publishedTime?: string;
  authors?: string[];
}

export function constructMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '',
  image = '/og-image.png',
  noIndex = false,
  type = 'website',
  keywords = DEFAULT_KEYWORDS,
  publishedTime,
  authors,
}: ConstructMetadataProps = {}): Metadata {
  const baseUrl = getBaseUrl();
  const fullTitle = title ? `${title} | ${APP_NAME}` : `${APP_NAME} · ${APP_SLOGAN}`;
  const canonicalPath = path.startsWith('/') ? path : `/${path}`;
  const canonicalUrl = `${baseUrl}${canonicalPath === '/' ? '' : canonicalPath}`;
  const imageUrl = image.startsWith('http') ? image : `${baseUrl}${image.startsWith('/') ? image : `/${image}`}`;

  return {
    title: fullTitle,
    description,
    keywords,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: canonicalUrl,
    },
    authors: authors ? authors.map((name) => ({ name })) : [{ name: 'HackMate Team', url: baseUrl }],
    creator: 'HackMate',
    publisher: 'HackMate',
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            'max-video-preview': -1,
            'max-image-preview': 'none',
            'max-snippet': -1,
          },
        }
      : {
          index: true,
          follow: true,
          nocache: false,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: APP_NAME,
      locale: 'en_US',
      type: type === 'article' ? 'article' : 'website',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${APP_NAME} - ${title || APP_SLOGAN}`,
        },
      ],
      ...(publishedTime && type === 'article' ? { publishedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [imageUrl],
      creator: '@hackmate',
    },
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon.ico',
      apple: '/apple-touch-icon.png',
    },
    category: 'technology',
  };
}
