import { and, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth/server';
import { getCoreDb, hasCoreDatabase } from '@/lib/db/core';
import { getRequestById } from '@/lib/db/queries/requests';
import { teamRequests } from '@/lib/db/schema/core';
import { failure, success } from '@/lib/http';
import { enforceRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  const rl = await enforceRateLimit(`request-action:${userId}`, 20, 60);
  if (!rl.success && rl.response) return rl.response;

  const id = (await params).id;
  const existing = await getRequestById(id);
  if (!existing || existing.fromUserId !== userId) return failure('NOT_FOUND', 'Request not found.', 404);
  if (existing.status !== 'pending') return failure('REQUEST_NOT_PENDING', 'This request is no longer pending.', 409);

  const db = getCoreDb();
  const [updated] = await db.update(teamRequests).set({ status: 'withdrawn', updatedAt: new Date() }).where(and(eq(teamRequests.id, id), eq(teamRequests.status, 'pending'))).returning();
  if (!updated) return failure('REQUEST_NOT_PENDING', 'This request is no longer pending.', 409);
  return success(updated);
}
