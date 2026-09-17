import { getProviders } from '../src/lib/hackathons/providers';
import { markExpiredHackathons, upsertHackathonSource } from '../src/lib/db/queries/hackathons';
import { getCoreDb } from '../src/lib/db/core';
import { hackathonSources } from '../src/lib/db/schema/core';
import { sql } from 'drizzle-orm';

async function syncAll() {
  console.log('--- Starting Multi-Provider Synchronization ---');
  const providers = getProviders();
  const summary: Record<string, { fetched: number; created: number; updated: number; failed: number }> = {};

  for (const provider of providers) {
    console.log(`\nFetching from provider: ${provider.name}...`);
    const stats = { fetched: 0, created: 0, updated: 0, failed: 0 };
    try {
      const items = await provider.fetchHackathons();
      stats.fetched = items.length;
      console.log(`Fetched ${items.length} hackathons from ${provider.name}. Upserting...`);

      for (const item of items) {
        try {
          const res = await upsertHackathonSource({
            source: item.source as 'unstop' | 'devfolio' | 'hack2skill',
            sourceId: item.sourceId,
            title: item.title,
            description: item.description ?? undefined,
            organizer: item.organizer ?? undefined,
            startAt: item.startAt ?? undefined,
            endAt: item.endAt ?? undefined,
            registrationDeadlineAt: item.registrationDeadlineAt ?? undefined,
            timezone: item.timezone,
            mode: item.mode ?? undefined,
            location: item.location ?? undefined,
            teamSizeMin: item.teamSizeMin ?? undefined,
            teamSizeMax: item.teamSizeMax ?? undefined,
            prizeAmount: item.prizeAmount != null ? String(item.prizeAmount) : undefined,
            prizeCurrency: item.prizeCurrency,
            prizeDisplay: item.prizeDisplay ?? undefined,
            themes: item.themes || [],
            techStack: item.techStack || [],
            registrationUrl: item.registrationUrl ?? undefined,
            sourceUrl: item.sourceUrl ?? undefined,
            rawPayload: item.rawPayload,
          });

          if (res.action === 'created') stats.created++;
          else stats.updated++;
        } catch (itemErr: unknown) {
          stats.failed++;
          console.error(`Failed item ${item.source}:${item.sourceId}:`, (itemErr as Error).message);
        }
      }
    } catch (providerErr: unknown) {
      console.error(`Provider ${provider.name} failed:`, (providerErr as Error).message);
    }
    summary[provider.name] = stats;
  }

  const expiredCount = await markExpiredHackathons();
  console.log(`\nMarked ${expiredCount} past hackathons as expired.`);

  console.log('\n--- Sync Summary ---');
  console.table(summary);

  const db = getCoreDb();
  const sources = await db
    .select({
      source: hackathonSources.source,
      count: sql<number>`count(*)::int`,
    })
    .from(hackathonSources)
    .groupBy(hackathonSources.source);

  console.log('\n--- Current Hackathon Sources in Database ---');
  console.table(sources);
}

syncAll().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
