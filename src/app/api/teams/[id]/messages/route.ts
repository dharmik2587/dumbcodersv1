import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth/server';
import { hasCoreDatabase } from '@/lib/db/core';
import { isTeamMember, createTeamMessage, listTeamMessages } from '@/lib/db/queries/teams';
import { createNotification } from '@/lib/db/queries/notifications';
import { getTeamById } from '@/lib/db/queries/teams';
import { failure, success } from '@/lib/http';
import { enforceRateLimit } from '@/lib/ratelimit';
import { triggerPusherEvent } from '@/lib/pusher';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return failure('UNAUTHORIZED', 'Sign in to continue.', 401);
  }

  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  const teamId = (await params).id;
  const isMember = await isTeamMember(teamId, userId);
  if (!isMember) return failure('FORBIDDEN', 'You must be a team member to view messages.', 403);

  try {
    const messages = await listTeamMessages(teamId);
    return success(messages);
  } catch (error: unknown) {
    console.error('GET /api/teams/[id]/messages failed', error);
    return failure('DATABASE_ERROR', 'Could not load messages.', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return failure('UNAUTHORIZED', 'Sign in to continue.', 401);
  }

  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  const rl = await enforceRateLimit(`team-msg:${userId}`, 30, 60);
  if (!rl.success && rl.response) return rl.response;

  const teamId = (await params).id;
  const isMember = await isTeamMember(teamId, userId);
  if (!isMember) return failure('FORBIDDEN', 'You must be a team member to post messages.', 403);

  const body = await request.json().catch(() => null);
  const content = (body?.content as string)?.trim();
  if (!content) return failure('VALIDATION_ERROR', 'Message content is required.', 400);

  try {
    const message = await createTeamMessage(teamId, userId, content);

    // Broadcast via Pusher for real-time chat updates
    await triggerPusherEvent(`team-${teamId}`, 'new_message', message);

    // Notify other team members in their Neon notifications inbox
    const teamData = await getTeamById(teamId);
    if (teamData) {
      for (const m of teamData.members) {
        if (m.member.userId !== userId) {
          await createNotification({
            userId: m.member.userId,
            type: 'team_message',
            title: `New message in ${teamData.team.name}`,
            message: content.length > 80 ? `${content.slice(0, 80)}…` : content,
            href: `/teams/${teamId}`,
          });
        }
      }
    }

    return success(message);
  } catch (error: unknown) {
    console.error('POST /api/teams/[id]/messages failed', error);
    return failure('DATABASE_ERROR', 'Could not post message.', 500);
  }
}
