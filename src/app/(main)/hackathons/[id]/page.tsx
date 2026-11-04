import type { Metadata } from 'next';
import { getHackathonById } from '@/lib/db/queries/hackathons';
import { HACKATHONS } from '@/client/data/seed';
import { constructMetadata, getBaseUrl } from '@/lib/seo/metadata';
import { HackathonDetailClient } from './HackathonDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function resolveHackathon(id: string) {
  try {
    const dbHackathon = await getHackathonById(id);
    if (dbHackathon) {
      return {
        id: dbHackathon.id,
        name: dbHackathon.title,
        description: dbHackathon.description || 'Join this collegiate hackathon and build innovative solutions.',
        host: dbHackathon.organizer || 'Hackathon Host',
        startDate: dbHackathon.startAt ? dbHackathon.startAt.toISOString() : new Date().toISOString(),
        endDate: dbHackathon.endAt ? dbHackathon.endAt.toISOString() : undefined,
        registerDeadline: dbHackathon.registrationDeadlineAt ? dbHackathon.registrationDeadlineAt.toISOString() : undefined,
        prize: dbHackathon.prizeDisplay || (dbHackathon.prizeAmount ? `₹${Number(dbHackathon.prizeAmount).toLocaleString('en-IN')}` : 'Prizes to be announced'),
        mode: dbHackathon.mode || 'hybrid',
        location: dbHackathon.location || 'India',
        tracks: dbHackathon.themes || ['General', 'Open Innovation'],
        registrationUrl: dbHackathon.registrationUrl,
      };
    }
  } catch (err) {
    console.warn(`Error querying hackathon ${id} for metadata`, err);
  }

  const seed = HACKATHONS.find((h) => h.id === id);
  if (seed) {
    return {
      id: seed.id,
      name: seed.name,
      description: seed.description,
      host: seed.host,
      startDate: seed.startDate,
      endDate: undefined,
      registerDeadline: seed.registerDeadline,
      prize: `₹${seed.prize.toLocaleString('en-IN')}`,
      mode: seed.mode,
      location: seed.city,
      tracks: seed.tracks,
      registrationUrl: seed.registrationUrl,
    };
  }

  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const hackathon = await resolveHackathon(id);

  if (!hackathon) {
    return constructMetadata({
      title: 'Hackathon Not Found',
      description: 'The requested hackathon could not be found or has expired.',
      path: `/hackathons/${id}`,
      noIndex: true,
    });
  }

  const title = `${hackathon.name} - Teammates & Event Details`;
  const description = `${hackathon.name} by ${hackathon.host}. Mode: ${hackathon.mode.toUpperCase()}. Prize: ${hackathon.prize}. Find complementary teammates, build winning projects, and register on HackMate.`;

  return constructMetadata({
    title,
    description,
    path: `/hackathons/${id}`,
    keywords: [
      hackathon.name,
      `${hackathon.name} teammates`,
      `${hackathon.host} hackathon`,
      `${hackathon.mode} hackathons`,
      ...hackathon.tracks,
      'college hackathons',
      'hackathon team finder',
    ],
  });
}

export default async function HackathonDetailPage({ params }: PageProps) {
  const { id } = await params;
  const hackathon = await resolveHackathon(id);
  const baseUrl = getBaseUrl();

  const eventSchema = hackathon
    ? {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: hackathon.name,
        description: hackathon.description,
        startDate: hackathon.startDate,
        endDate: hackathon.endDate || hackathon.startDate,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode:
          hackathon.mode.toLowerCase() === 'online'
            ? 'https://schema.org/OnlineEventAttendanceMode'
            : hackathon.mode.toLowerCase() === 'offline'
              ? 'https://schema.org/OfflineEventAttendanceMode'
              : 'https://schema.org/MixedEventAttendanceMode',
        location:
          hackathon.mode.toLowerCase() === 'online'
            ? {
                '@type': 'VirtualLocation',
                url: hackathon.registrationUrl || `${baseUrl}/hackathons/${id}`,
              }
            : {
                '@type': 'Place',
                name: hackathon.location,
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: hackathon.location,
                  addressCountry: 'IN',
                },
              },
        organizer: {
          '@type': 'Organization',
          name: hackathon.host,
        },
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'INR',
          availability: 'https://schema.org/InStock',
          url: `${baseUrl}/hackathons/${id}`,
          validFrom: hackathon.startDate,
        },
      }
    : null;

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
      ...(hackathon
        ? [
            {
              '@type': 'ListItem',
              position: 3,
              name: hackathon.name,
              item: `${baseUrl}/hackathons/${id}`,
            },
          ]
        : []),
    ],
  };

  return (
    <>
      {eventSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <HackathonDetailClient />
    </>
  );
}
