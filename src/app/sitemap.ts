import type { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/seo/metadata';
import { getCoreDb } from '@/lib/db/core';
import { hackathons, profiles } from '@/lib/db/schema/core';
import { eq, desc } from 'drizzle-orm';
import { BUILDERS, HACKATHONS } from '@/client/data/seed';

export const revalidate = 3600; // Revalidate sitemap every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const now = new Date();

  // 1. Static high-value routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/hackathons`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/builders`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/campus-reps`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/careers`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/changelog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // 2. Fetch published hackathons from database with fallback to seed data
  let hackathonRoutes: MetadataRoute.Sitemap = [];
  try {
    const db = getCoreDb();
    const rows = await db
      .select({ id: hackathons.id, updatedAt: hackathons.updatedAt })
      .from(hackathons)
      .where(eq(hackathons.status, 'published'))
      .orderBy(desc(hackathons.updatedAt))
      .limit(500);

    if (rows.length > 0) {
      hackathonRoutes = rows.map((h) => ({
        url: `${baseUrl}/hackathons/${h.id}`,
        lastModified: h.updatedAt || now,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }));
    }
  } catch (err) {
    console.warn('Sitemap hackathons DB query failed; falling back to seed events', err);
  }

  if (hackathonRoutes.length === 0) {
    hackathonRoutes = HACKATHONS.map((h) => ({
      url: `${baseUrl}/hackathons/${h.id}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));
  }

  // 3. Fetch builder profiles from database with fallback to seed data
  let builderRoutes: MetadataRoute.Sitemap = [];
  try {
    const db = getCoreDb();
    const rows = await db
      .select({ id: profiles.id, updatedAt: profiles.updatedAt })
      .from(profiles)
      .where(eq(profiles.onboardingDone, true))
      .orderBy(desc(profiles.updatedAt))
      .limit(500);

    if (rows.length > 0) {
      builderRoutes = rows.map((p) => ({
        url: `${baseUrl}/b/${p.id}`,
        lastModified: p.updatedAt || now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch (err) {
    console.warn('Sitemap profiles DB query failed; falling back to seed builders', err);
  }

  if (builderRoutes.length === 0) {
    builderRoutes = BUILDERS.map((b) => ({
      url: `${baseUrl}/b/${b.id}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  }

  return [...staticRoutes, ...hackathonRoutes, ...builderRoutes];
}
