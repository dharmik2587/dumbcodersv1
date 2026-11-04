import Discover from '../discover/page';
import type { Metadata } from 'next';
import { constructMetadata, getBaseUrl } from '@/lib/seo/metadata';

export const metadata: Metadata = constructMetadata({
  title: 'Find College Hackathons 2026 · Live Devfolio & Unstop Events',
  description:
    'Discover verified college hackathons across India. Filter by tech track, mode (online/in-person), and prize pools. Find complementary teammates on HackMate before deadlines close.',
  path: '/hackathons',
  keywords: [
    'college hackathons 2026',
    'student hackathon list',
    'devfolio hackathons',
    'unstop coding competitions',
    'hack2skill hackathons',
    'hackathons with cash prize',
    'hackathon teammate matching',
  ],
});

export default function HackathonsPage() {
  const baseUrl = getBaseUrl();
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Hackathons',
        item: `${baseUrl}/hackathons`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Discover />
    </>
  );
}
