import { and, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth/server';
import { getCoreDb, hasCoreDatabase } from '@/lib/db/core';
import { getTeamById } from '@/lib/db/queries/teams';
import { teamMembers } from '@/lib/db/schema/core';
import { failure, success } from '@/lib/http';
import { enforceRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  let leaderId: string;
  try { leaderId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  const rl = await enforceRateLimit(`team-member-del:${leaderId}`, 20, 60);
  if (!rl.success && rl.response) return rl.response;
  const { id: teamId, userId } = await params;
  const teamResult = await getTeamById(teamId);
  if (!teamResult) return failure('NOT_FOUND', 'Team not found.', 404);
  if (teamResult.team.leaderId !== leaderId) return failure('FORBIDDEN', 'Only the team leader can remove members.', 403);
  if (userId === leaderId) return failure('INVALID_MEMBER', 'The team leader cannot be removed.', 400);
  const db = getCoreDb();
  await db.delete(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  return success({ removed: true });
}
