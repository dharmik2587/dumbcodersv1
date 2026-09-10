import { and, count, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth/server';
import { getCoreDb, hasCoreDatabase } from '@/lib/db/core';
import { createNotification, createOutboxEvent } from '@/lib/db/queries/notifications';
import { getTeamById } from '@/lib/db/queries/teams';
import { profiles, teamMembers, teamRequests } from '@/lib/db/schema/core';
import { failure, success } from '@/lib/http';
import { teamInviteSchema } from '@/lib/validations/team';
import { enforceRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  const rl = await enforceRateLimit(`team-invite:${userId}`, 15, 60);
  if (!rl.success && rl.response) return rl.response;

  const teamId = (await params).id;
  const teamResult = await getTeamById(teamId);
  if (!teamResult) return failure('NOT_FOUND', 'Team not found.', 404);
  if (teamResult.team.leaderId !== userId) return failure('FORBIDDEN', 'Only the team leader can invite members.', 403);
  const parsed = teamInviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return failure('VALIDATION_ERROR', 'Invalid invite.', 400);
  const db = getCoreDb();
  const target = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, parsed.data.userId)).limit(1);
  if (!target[0]) return failure('NOT_FOUND', 'User not found.', 404);
  const memberCount = await db.select({ total: count() }).from(teamMembers).where(eq(teamMembers.teamId, teamId));
  if (Number(memberCount[0]?.total ?? 0) >= teamResult.team.maxMembers) return failure('TEAM_FULL', 'This team is full.', 409);
  const existing = await db.select({ id: teamRequests.id }).from(teamRequests).where(and(eq(teamRequests.fromUserId, userId), eq(teamRequests.toUserId, parsed.data.userId), eq(teamRequests.teamId, teamId), eq(teamRequests.status, 'pending'))).limit(1);
  if (existing[0]) return failure('DUPLICATE_REQUEST', 'An invite is already pending.', 409);
  const [created] = await db.insert(teamRequests).values({ type: 'team_invite', fromUserId: userId, toUserId: parsed.data.userId, teamId, hackathonId: teamResult.team.hackathonId, message: parsed.data.message ?? null, roleOffered: parsed.data.role ?? null }).returning();
  if (!created) return failure('CREATE_FAILED', 'Could not create invite.', 500);
  await createNotification({ userId: parsed.data.userId, type: 'team_invite', title: 'Team invitation', message: `You have been invited to join ${teamResult.team.name}.`, href: `/teams/${teamId}`, dedupeKey: `team-request:${created.id}:received` });
  await createOutboxEvent({ eventType: 'team_invite.created', aggregateType: 'team_request', aggregateId: created.id, payload: { teamId, toUserId: parsed.data.userId } });
  return success(created, { status: 201 });
}
