import { desc, eq } from 'drizzle-orm';
import { getCoreDb, hasCoreDatabase } from '@/lib/db/core';
import { ingestionRuns } from '@/lib/db/schema/core';
import { checkAllProvidersHealth } from '@/lib/hackathons/providers';
import { success } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const providerHealth = await checkAllProvidersHealth();

  // Optionally augment with latest ingestion run info
  const recentRuns: Record<string, unknown> = {};
  if (hasCoreDatabase()) {
    try {
      const db = getCoreDb();
      for (const providerName of Object.keys(providerHealth)) {
        const [lastRun] = await db
          .select({
            status: ingestionRuns.status,
            totalReceived: ingestionRuns.totalReceived,
            createdCount: ingestionRuns.createdCount,
            updatedCount: ingestionRuns.updatedCount,
            rejectedCount: ingestionRuns.rejectedCount,
            finishedAt: ingestionRuns.finishedAt,
            errors: ingestionRuns.errors,
          })
          .from(ingestionRuns)
          .where(eq(ingestionRuns.source, providerName))
          .orderBy(desc(ingestionRuns.startedAt))
          .limit(1);

        if (lastRun) {
          recentRuns[providerName] = lastRun;
        }
      }
    } catch (e) {
      console.warn('[Health/Providers] Failed to query latest ingestion runs:', e);
    }
  }

  return success({
    providers: providerHealth,
    recentRuns,
    timestamp: new Date().toISOString(),
  });
}
