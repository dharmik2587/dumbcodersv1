import { and, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth/server';
import { getCoreDb, hasCoreDatabase } from '@/lib/db/core';
import { createNotification, createOutboxEvent } from '@/lib/db/queries/notifications';
import { listRequests } from '@/lib/db/queries/requests';
import { profiles, teamRequests } from '@/lib/db/schema/core';
import { failure, success } from '@/lib/http';
import { createRequestSchema } from '@/lib/validations/request';
import { enforceRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);
  const direction = request.nextUrl.searchParams.get('direction');
  const safeDirection = direction === 'received' || direction === 'sent' ? direction : 'all';
  return success(await listRequests(userId, safeDirection));
}

export async function POST(request: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  const rl = await enforceRateLimit(`requests:${userId}`, 15, 60);
  if (!rl.success && rl.response) return rl.response;

  const parsed = createRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return failure('VALIDATION_ERROR', 'Invalid collaboration request.', 400);
  if (parsed.data.toUserId === userId) return failure('INVALID_RECIPIENT', 'You cannot request yourself.', 400);

  const db = getCoreDb();
  const recipient = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, parsed.data.toUserId)).limit(1);
  if (!recipient[0]) return failure('NOT_FOUND', 'Recipient not found.', 404);

  const existing = await db.select({ id: teamRequests.id }).from(teamRequests).where(and(eq(teamRequests.fromUserId, userId), eq(teamRequests.toUserId, parsed.data.toUserId), eq(teamRequests.status, 'pending'))).limit(1);
  if (existing[0]) return failure('DUPLICATE_REQUEST', 'A pending request already exists.', 409);

  const [created] = await db.insert(teamRequests).values({
    fromUserId: userId,
    toUserId: parsed.data.toUserId,
    teamId: parsed.data.teamId ?? null,
    hackathonId: parsed.data.hackathonId ?? null,
    message: parsed.data.message ?? null,
    roleOffered: parsed.data.roleOffered ?? null,
  }).returning();

  if (!created) return failure('CREATE_FAILED', 'Could not create the request.', 500);

  await createNotification({
    userId: parsed.data.toUserId,
    type: 'team_request',
    title: 'New team-up request',
    message: 'Someone wants to collaborate with you on HackMate.',
    href: '/requests',
    dedupeKey: `request:${created.id}:received`,
  });
  await createOutboxEvent({
    eventType: 'team_request.created',
    aggregateType: 'team_request',
    aggregateId: created.id,
    payload: { fromUserId: userId, toUserId: parsed.data.toUserId },
  });

  return success(created, { status: 201 });
}
