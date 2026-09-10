import { and, count, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth/server';
import { getCoreDb, hasCoreDatabase } from '@/lib/db/core';
import { createNotification, createOutboxEvent } from '@/lib/db/queries/notifications';
import { getTeamById, isTeamMember } from '@/lib/db/queries/teams';
import { teamMembers, teamRequests } from '@/lib/db/schema/core';
import { failure, success } from '@/lib/http';
import { createRequestSchema } from '@/lib/validations/request';
import { enforceRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  const rl = await enforceRateLimit(`team-apply:${userId}`, 15, 60);
  if (!rl.success && rl.response) return rl.response;

  const teamId = (await params).id;
  const teamResult = await getTeamById(teamId);
  if (!teamResult) return failure('NOT_FOUND', 'Team not found.', 404);
  if (!teamResult.team.isOpen || teamResult.team.status !== 'forming') return failure('TEAM_CLOSED', 'This team is not accepting applications.', 409);
  if (await isTeamMember(teamId, userId)) return failure('ALREADY_MEMBER', 'You are already on this team.', 409);

  const db = getCoreDb();
  const memberCount = await db.select({ total: count() }).from(teamMembers).where(eq(teamMembers.teamId, teamId));
  if (Number(memberCount[0]?.total ?? 0) >= teamResult.team.maxMembers) return failure('TEAM_FULL', 'This team is full.', 409);
  const body = await request.json().catch(() => ({}));
  const parsed = createRequestSchema.safeParse({ ...body, toUserId: teamResult.team.leaderId, teamId });
  if (!parsed.success) return failure('VALIDATION_ERROR', 'Invalid application.', 400);

  const existing = await db.select({ id: teamRequests.id }).from(teamRequests).where(and(eq(teamRequests.fromUserId, userId), eq(teamRequests.teamId, teamId), eq(teamRequests.status, 'pending'))).limit(1);
  if (existing[0]) return failure('DUPLICATE_REQUEST', 'You already applied to this team.', 409);
  const [created] = await db.insert(teamRequests).values({ fromUserId: userId, toUserId: teamResult.team.leaderId, teamId, hackathonId: teamResult.team.hackathonId, message: parsed.data.message ?? null, roleOffered: parsed.data.roleOffered ?? null, type: 'team_application' }).returning();
  if (!created) return failure('CREATE_FAILED', 'Could not submit application.', 500);
  await createNotification({ userId: teamResult.team.leaderId, type: 'team_application', title: 'New team application', message: 'A student applied to join your team.', href: `/teams/${teamId}`, dedupeKey: `team-request:${created.id}:received` });
  await createOutboxEvent({ eventType: 'team_application.created', aggregateType: 'team_request', aggregateId: created.id, payload: { teamId, fromUserId: userId } });
  return success(created, { status: 201 });
}
