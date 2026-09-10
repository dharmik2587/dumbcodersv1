import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth/server';
import { getCoreDb, hasCoreDatabase } from '@/lib/db/core';
import { createOutboxEvent } from '@/lib/db/queries/notifications';
import { listMyTeams } from '@/lib/db/queries/teams';
import { teamMembers, teams } from '@/lib/db/schema/core';
import { failure, success } from '@/lib/http';
import { createTeamSchema } from '@/lib/validations/team';
import { enforceRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export async function GET() {
  let userId: string;
  try { userId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);
  return success(await listMyTeams(userId));
}

export async function POST(request: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  const rl = await enforceRateLimit(`teams-create:${userId}`, 10, 60);
  if (!rl.success && rl.response) return rl.response;
  const parsed = createTeamSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return failure('VALIDATION_ERROR', 'Invalid team details.', 400);
  const db = getCoreDb();
  const [team] = await db.insert(teams).values({ ...parsed.data, hackathonId: parsed.data.hackathonId ?? null, description: parsed.data.description ?? null, leaderId: userId }).returning();
  if (!team) return failure('CREATE_FAILED', 'Could not create the team.', 500);
  await db.insert(teamMembers).values({ teamId: team.id, userId, role: 'leader' });
  await createOutboxEvent({ eventType: 'team.created', aggregateType: 'team', aggregateId: team.id, payload: { leaderId: userId } });
  return success(team, { status: 201 });
}
