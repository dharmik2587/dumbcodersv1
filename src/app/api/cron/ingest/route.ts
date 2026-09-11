import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { getCoreDb, hasCoreDatabase } from '@/lib/db/core';
import { markExpiredHackathons, upsertHackathonSource } from '@/lib/db/queries/hackathons';
import { ingestionRuns } from '@/lib/db/schema/core';
import { getProviders, type HackathonProvider, type NormalizedHackathon } from '@/lib/hackathons/providers';
import { failure, success } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authenticateCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || process.env.N8N_INGEST_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const headerSecret = request.headers.get('x-cron-secret')?.trim();
  const urlParam = request.nextUrl.searchParams.get('key')?.trim();

  const candidate = authHeader || headerSecret || urlParam;
  if (!candidate) return false;

  const bufA = Buffer.from(candidate);
  const bufB = Buffer.from(secret);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

interface ProviderRunResult {
  status: 'success' | 'partial' | 'failed';
  received: number;
  created: number;
  updated: number;
  rejected: number;
  durationMs: number;
  errorCode?: string;
  errorMessage?: string;
}

export async function GET(request: NextRequest) {
  if (!authenticateCron(request)) {
    return failure('UNAUTHORIZED', 'Invalid or missing cron credentials.', 401);
  }

  if (!hasCoreDatabase()) {
    return failure('NOT_CONFIGURED', 'Database is not configured.', 503);
  }

  const db = getCoreDb();
  const runId = `cron_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const providers = getProviders();
  const providerResults: Record<string, ProviderRunResult> = {};

  // Run each provider in complete isolation using Promise.allSettled
  const settled = await Promise.allSettled(
    providers.map(async (provider: HackathonProvider) => {
      const startTime = Date.now();
      const [runRecord] = await db
        .insert(ingestionRuns)
        .values({
          externalRunId: `${runId}_${provider.name}`,
          source: provider.name,
          status: 'running',
          totalReceived: 0,
        })
        .returning();

      let items: NormalizedHackathon[] = [];
      try {
        items = await provider.fetchHackathons();
      } catch (fetchErr: unknown) {
        const errorMsg = fetchErr instanceof Error ? fetchErr.message : 'Provider fetch failed';
        const isTimeout = errorMsg.includes('UPSTREAM_TIMEOUT') || errorMsg.includes('timed out');
        const errorCode = isTimeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_PROVIDER_ERROR';

        if (runRecord) {
          await db
            .update(ingestionRuns)
            .set({
              status: 'failed',
              errors: [errorMsg],
              finishedAt: new Date(),
            })
            .where(eq(ingestionRuns.id, runRecord.id));
        }

        return {
          providerName: provider.name,
          result: {
            status: 'failed' as const,
            received: 0,
            created: 0,
            updated: 0,
            rejected: 0,
            durationMs: Date.now() - startTime,
            errorCode,
            errorMessage: errorMsg,
          },
        };
      }

      let created = 0;
      let updated = 0;
      const errors: string[] = [];

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

          if (res.action === 'created') created++;
          else updated++;
        } catch (itemErr: unknown) {
          errors.push(
            `${item.source}:${item.sourceId} - ${itemErr instanceof Error ? itemErr.message : 'failed'}`
          );
        }
      }

      const rejected = errors.length;
      const finalStatus: 'success' | 'partial' | 'failed' =
        rejected === items.length && items.length > 0
          ? 'failed'
          : rejected > 0
          ? 'partial'
          : 'success';

      if (runRecord) {
        await db
          .update(ingestionRuns)
          .set({
            status: finalStatus === 'success' ? 'completed' : finalStatus,
            totalReceived: items.length,
            createdCount: created,
            updatedCount: updated,
            rejectedCount: rejected,
            errors,
            finishedAt: new Date(),
          })
          .where(eq(ingestionRuns.id, runRecord.id));
      }

      return {
        providerName: provider.name,
        result: {
          status: finalStatus,
          received: items.length,
          created,
          updated,
          rejected,
          durationMs: Date.now() - startTime,
        },
      };
    })
  );

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];
    const pName = providers[i].name;

    if (outcome.status === 'fulfilled') {
      providerResults[outcome.value.providerName] = outcome.value.result;
    } else {
      providerResults[pName] = {
        status: 'failed',
        received: 0,
        created: 0,
        updated: 0,
        rejected: 0,
        durationMs: 0,
        errorCode: 'UNHANDLED_PROVIDER_ERROR',
        errorMessage: outcome.reason instanceof Error ? outcome.reason.message : 'Unhandled failure',
      };
    }
  }

  // Handle expired hackathons
  let expiredCount = 0;
  try {
    expiredCount = await markExpiredHackathons();
  } catch (expiredErr) {
    console.error('Failed to mark expired hackathons:', expiredErr);
  }

  return success({
    runId,
    timestamp: new Date().toISOString(),
    expiredUpdated: expiredCount,
    providers: providerResults,
  });
}
