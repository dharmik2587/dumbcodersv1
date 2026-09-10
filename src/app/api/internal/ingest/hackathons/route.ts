import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { getCoreDb, hasCoreDatabase } from '@/lib/db/core';
import { ingestionRuns } from '@/lib/db/schema/core';
import { upsertHackathonSource } from '@/lib/db/queries/hackathons';
import { failure, success } from '@/lib/http';
import { hackathonIngestSchema } from '@/lib/validations/hackathon';

export const runtime = 'nodejs';

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function authenticate(request: NextRequest, rawBody: string) {
  const secret = process.env.N8N_INGEST_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const signature = request.headers.get('x-hackmate-signature');
  const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(provided, secret) || (signature ? safeEqual(signature, expectedSignature) : false);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!authenticate(request, rawBody)) return failure('UNAUTHORIZED', 'Invalid ingestion credentials.', 401);
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return failure('INVALID_JSON', 'The ingestion payload is not valid JSON.', 400);
  }

  const parsed = hackathonIngestSchema.safeParse(body);
  if (!parsed.success) return failure('VALIDATION_ERROR', 'The ingestion payload is invalid.', 400);

  const db = getCoreDb();
  const externalRunId = parsed.data.runId ?? request.headers.get('x-ingestion-run-id') ?? null;
  let run = externalRunId
    ? (await db.select().from(ingestionRuns).where(eq(ingestionRuns.externalRunId, externalRunId)).limit(1))[0]
    : undefined;

  if (!run) {
    [run] = await db.insert(ingestionRuns).values({
      externalRunId,
      source: parsed.data.source,
      status: 'running',
      totalReceived: parsed.data.hackathons.length,
    }).returning();
  }

  if (!run) return failure('INGESTION_RUN_ERROR', 'Could not create ingestion run.', 500);
  if (run.status === 'completed') return success({ runId: run.id, duplicate: true, inserted: 0, updated: 0, rejected: 0 });

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  const items = parsed.data.hackathons;
  const batchSize = 5;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (item) => {
        try {
          const result = await upsertHackathonSource(item);
          if (result.action === 'created') created += 1;
          else updated += 1;
        } catch (error) {
          errors.push(`${item.source}:${item.sourceId} — ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      })
    );
  }

  const rejected = errors.length;
  await db.update(ingestionRuns).set({
    status: rejected === parsed.data.hackathons.length ? 'failed' : rejected ? 'partial' : 'completed',
    totalReceived: parsed.data.hackathons.length,
    createdCount: created,
    updatedCount: updated,
    rejectedCount: rejected,
    errors,
    finishedAt: new Date(),
  }).where(and(eq(ingestionRuns.id, run.id)));

  return success({ runId: run.id, inserted: created, updated, rejected, errors });
}
