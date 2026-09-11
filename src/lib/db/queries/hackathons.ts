import crypto from 'node:crypto';
import { and, asc, count, desc, eq, ilike, sql } from 'drizzle-orm';
import { getCoreDb } from '@/lib/db/core';
import { hackathonBookmarks, hackathonInterests, hackathons, hackathonSources } from '@/lib/db/schema/core';
import type { HackathonIngestItem } from '@/lib/validations/hackathon';

export function computePayloadHash(payload: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload ?? {})).digest('hex');
}

export function computeCanonicalKey(organizer: string | null | undefined, title: string, startAt: string | null | undefined): string {
  const cleanOrg = (organizer || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const dateStr = startAt ? new Date(startAt).toISOString().slice(0, 10) : 'tbd';
  return `${cleanOrg ? `${cleanOrg}-` : ''}${cleanTitle}-${dateStr}`;
}

function dateOrNull(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

function hackathonValues(item: HackathonIngestItem, canonicalKey: string) {
  return {
    canonicalKey,
    title: item.title,
    description: item.description ?? null,
    organizer: item.organizer ?? null,
    startAt: dateOrNull(item.startAt),
    endAt: dateOrNull(item.endAt),
    registrationDeadlineAt: dateOrNull(item.registrationDeadlineAt),
    timezone: item.timezone || 'Asia/Kolkata',
    mode: item.mode ?? null,
    location: item.location ?? null,
    teamSizeMin: item.teamSizeMin ?? null,
    teamSizeMax: item.teamSizeMax ?? null,
    prizeAmount: item.prizeAmount ? String(item.prizeAmount) : null,
    prizeCurrency: item.prizeCurrency || 'INR',
    prizeDisplay: item.prizeDisplay ?? null,
    themes: item.themes || [],
    techStack: item.techStack || [],
    registrationUrl: item.registrationUrl ?? null,
    sourceUrl: item.sourceUrl ?? null,
    status: 'published',
    updatedAt: new Date(),
    lastSeenAt: new Date(),
  };
}

export async function upsertHackathonSource(item: HackathonIngestItem) {
  const db = getCoreDb();
  const payloadHash = computePayloadHash(item.rawPayload || item);

  // 1. Check if this exact provider listing (source, sourceId) already exists
  const existingSource = await db
    .select({ source: hackathonSources })
    .from(hackathonSources)
    .where(and(eq(hackathonSources.source, item.source), eq(hackathonSources.sourceId, item.sourceId)))
    .limit(1);

  if (existingSource[0]) {
    const existing = existingSource[0].source;
    const hackathonId = existing.hackathonId;

    // Payload Hash check: if payload has not changed, avoid rewriting canonical record
    if (existing.payloadHash === payloadHash) {
      const [touchedSource] = await db
        .update(hackathonSources)
        .set({
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(hackathonSources.id, existing.id))
        .returning();

      return { action: 'unchanged' as const, hackathonId, source: touchedSource };
    }

    // Payload changed: update canonical hackathon and source record
    const canonicalKey = item.canonicalKey ?? (await getHackathonById(hackathonId))?.canonicalKey ?? `${item.source}:${item.sourceId}`;
    await db.update(hackathons).set(hackathonValues(item, canonicalKey)).where(eq(hackathons.id, hackathonId));

    const [updatedSource] = await db
      .update(hackathonSources)
      .set({
        sourceUrl: item.sourceUrl ?? null,
        registrationUrl: item.registrationUrl ?? null,
        payloadHash,
        rawPayload: item.rawPayload,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(hackathonSources.id, existing.id))
      .returning();

    return { action: 'updated' as const, hackathonId, source: updatedSource };
  }

  // 2. New source listing: Deduplicate using deterministic canonicalKey
  const canonicalKey = item.canonicalKey || computeCanonicalKey(item.organizer, item.title, item.startAt);

  // Check if a canonical hackathon with this key already exists
  const existingCanonical = await db
    .select({ id: hackathons.id })
    .from(hackathons)
    .where(eq(hackathons.canonicalKey, canonicalKey))
    .limit(1);

  let targetHackathonId: string;
  let action: 'created' | 'updated' = 'created';

  if (existingCanonical[0]) {
    // Deduplicated: link to existing canonical hackathon
    targetHackathonId = existingCanonical[0].id;
    action = 'updated';
  } else {
    // Insert new canonical hackathon
    const [createdHackathon] = await db.insert(hackathons).values(hackathonValues(item, canonicalKey)).returning();
    if (!createdHackathon) throw new Error('Hackathon insert did not return a record');
    targetHackathonId = createdHackathon.id;
  }

  // 3. Insert source record linked to canonical hackathon
  const [createdSource] = await db
    .insert(hackathonSources)
    .values({
      hackathonId: targetHackathonId,
      source: item.source,
      sourceId: item.sourceId,
      sourceUrl: item.sourceUrl ?? null,
      registrationUrl: item.registrationUrl ?? null,
      payloadHash,
      rawPayload: item.rawPayload,
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return { action, hackathonId: targetHackathonId, source: createdSource };
}

export async function markExpiredHackathons() {
  const db = getCoreDb();
  const now = new Date();
  const result = await db
    .update(hackathons)
    .set({ status: 'expired', updatedAt: now })
    .where(
      and(
        eq(hackathons.status, 'published'),
        sql`${hackathons.registrationDeadlineAt} IS NOT NULL AND ${hackathons.registrationDeadlineAt} < ${now}`
      )
    )
    .returning({ id: hackathons.id });

  return result.length;
}

export async function getHackathonById(id: string) {
  const db = getCoreDb();
  const rows = await db.select().from(hackathons).where(eq(hackathons.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listHackathons(filters: {
  q?: string;
  source?: string;
  mode?: string;
  theme?: string;
  status?: string;
  page: number;
  pageSize: number;
}) {
  const db = getCoreDb();
  const conditions = [];
  if (filters.status) conditions.push(eq(hackathons.status, filters.status));
  if (filters.source) conditions.push(sql`exists (select 1 from ${hackathonSources} hs where hs.hackathon_id = ${hackathons.id} and hs.source = ${filters.source})`);
  if (filters.mode) conditions.push(eq(hackathons.mode, filters.mode));
  if (filters.theme) conditions.push(sql`${hackathons.themes} @> ARRAY[${filters.theme}]::text[]`);
  if (filters.q) conditions.push(ilike(hackathons.title, `%${filters.q}%`));

  const where = conditions.length ? and(...conditions) : undefined;
  const offset = (filters.page - 1) * filters.pageSize;
  const [rows, totalRows] = await Promise.all([
    db.select().from(hackathons).where(where).orderBy(asc(hackathons.registrationDeadlineAt), desc(hackathons.createdAt)).limit(filters.pageSize).offset(offset),
    db.select({ total: count() }).from(hackathons).where(where),
  ]);

  return {
    rows,
    total: Number(totalRows[0]?.total ?? 0),
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function getUserHackathonFlags(userId: string, hackathonId: string) {
  const db = getCoreDb();
  const [bookmark, interest] = await Promise.all([
    db.select({ id: hackathonBookmarks.id }).from(hackathonBookmarks).where(and(eq(hackathonBookmarks.userId, userId), eq(hackathonBookmarks.hackathonId, hackathonId))).limit(1),
    db.select({ id: hackathonInterests.id }).from(hackathonInterests).where(and(eq(hackathonInterests.userId, userId), eq(hackathonInterests.hackathonId, hackathonId))).limit(1),
  ]);
  return { bookmarked: Boolean(bookmark[0]), interested: Boolean(interest[0]) };
}
