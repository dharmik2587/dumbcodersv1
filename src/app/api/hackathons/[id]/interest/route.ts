import { and, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth/server';
import { getCoreDb, hasCoreDatabase } from '@/lib/db/core';
import { hackathonInterests, hackathons } from '@/lib/db/schema/core';
import { failure, success } from '@/lib/http';
import { enforceRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

async function toggle(request: NextRequest, id: string, remove: boolean) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  const rl = await enforceRateLimit(`interest:${userId}`, 30, 60);
  if (!rl.success && rl.response) return rl.response;

  const db = getCoreDb();
  const event = await db.select({ id: hackathons.id }).from(hackathons).where(eq(hackathons.id, id)).limit(1);
  if (!event[0]) return failure('NOT_FOUND', 'Hackathon not found.', 404);

  if (remove) await db.delete(hackathonInterests).where(and(eq(hackathonInterests.userId, userId), eq(hackathonInterests.hackathonId, id)));
  else await db.insert(hackathonInterests).values({ userId, hackathonId: id }).onConflictDoNothing();
  return success({ interested: !remove });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return toggle(request, (await params).id, false);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return toggle(request, (await params).id, true);
}
