import { and, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth/server';
import { getCoreDb, hasCoreDatabase } from '@/lib/db/core';
import { getTeamById, isTeamMember } from '@/lib/db/queries/teams';
import { teams } from '@/lib/db/schema/core';
import { failure, success } from '@/lib/http';
import { updateTeamSchema } from '@/lib/validations/team';
import { enforceRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);
  const team = await getTeamById((await params).id);
  if (!team) return failure('NOT_FOUND', 'Team not found.', 404);
  return success(team);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  const rl = await enforceRateLimit(`teams-mod:${userId}`, 20, 60);
  if (!rl.success && rl.response) return rl.response;

  const teamId = (await params).id;
  const team = await getTeamById(teamId);
  if (!team) return failure('NOT_FOUND', 'Team not found.', 404);
  if (team.team.leaderId !== userId) return failure('FORBIDDEN', 'Only the team leader can edit this team.', 403);
  const parsed = updateTeamSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return failure('VALIDATION_ERROR', 'Invalid team details.', 400);
  const db = getCoreDb();
  const [updated] = await db.update(teams).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(teams.id, teamId), eq(teams.leaderId, userId))).returning();
  return updated ? success(updated) : failure('UPDATE_FAILED', 'Could not update the team.', 500);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  const rl = await enforceRateLimit(`teams-mod:${userId}`, 10, 60);
  if (!rl.success && rl.response) return rl.response;

  const teamId = (await params).id;
  const team = await getTeamById(teamId);
  if (!team) return failure('NOT_FOUND', 'Team not found.', 404);
  if (team.team.leaderId !== userId) return failure('FORBIDDEN', 'Only the team leader can close this team.', 403);
  const db = getCoreDb();
  await db.update(teams).set({ status: 'closed', isOpen: false, updatedAt: new Date() }).where(eq(teams.id, teamId));
  return success({ closed: true });
}
