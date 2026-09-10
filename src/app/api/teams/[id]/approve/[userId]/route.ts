import { and, count, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth/server';
import { getCoreDb, hasCoreDatabase } from '@/lib/db/core';
import { createNotification, createOutboxEvent } from '@/lib/db/queries/notifications';
import { getTeamById } from '@/lib/db/queries/teams';
import { teamMembers, teamRequests } from '@/lib/db/schema/core';
import { failure, success } from '@/lib/http';
import { enforceRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  let leaderId: string;
  try { leaderId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  const rl = await enforceRateLimit(`team-approve:${leaderId}`, 20, 60);
  if (!rl.success && rl.response) return rl.response;
  const { id: teamId, userId } = await params;
  const teamResult = await getTeamById(teamId);
  if (!teamResult) return failure('NOT_FOUND', 'Team not found.', 404);
  if (teamResult.team.leaderId !== leaderId) return failure('FORBIDDEN', 'Only the team leader can approve members.', 403);
  const db = getCoreDb();
  const pending = await db.select().from(teamRequests).where(and(eq(teamRequests.teamId, teamId), eq(teamRequests.fromUserId, userId), eq(teamRequests.toUserId, leaderId), eq(teamRequests.status, 'pending'))).limit(1);
  if (!pending[0]) return failure('REQUEST_NOT_FOUND', 'Pending team request not found.', 404);
  const memberCount = await db.select({ total: count() }).from(teamMembers).where(eq(teamMembers.teamId, teamId));
  if (Number(memberCount[0]?.total ?? 0) >= teamResult.team.maxMembers) return failure('TEAM_FULL', 'This team is full.', 409);
  await db.insert(teamMembers).values({ teamId, userId, role: pending[0].roleOffered ?? null }).onConflictDoNothing();
  const [updated] = await db.update(teamRequests).set({ status: 'accepted', updatedAt: new Date() }).where(eq(teamRequests.id, pending[0].id)).returning();
  await createNotification({ userId, type: 'team_joined', title: 'You joined a team', message: `You were approved for ${teamResult.team.name}.`, href: `/teams/${teamId}`, dedupeKey: `team-request:${pending[0].id}:accepted` });
  await createOutboxEvent({ eventType: 'team_member.approved', aggregateType: 'team', aggregateId: teamId, payload: { userId, leaderId } });
  return success(updated);
}
