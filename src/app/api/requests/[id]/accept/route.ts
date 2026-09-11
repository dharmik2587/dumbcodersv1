import { and, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth/server';
import { getCoreDb, hasCoreDatabase } from '@/lib/db/core';
import { getOrCreateConversation } from '@/lib/db/queries/messages';
import { getRequestById } from '@/lib/db/queries/requests';
import { notifications, outboxEvents, profiles, teamMembers, teamRequests } from '@/lib/db/schema/core';
import { failure, success } from '@/lib/http';
import { enforceRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return failure('UNAUTHORIZED', 'Sign in to continue.', 401);
  }
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  const rl = await enforceRateLimit(`request-action:${userId}`, 20, 60);
  if (!rl.success && rl.response) return rl.response;

  const id = (await params).id;
  const existing = await getRequestById(id);
  if (!existing || existing.toUserId !== userId) return failure('NOT_FOUND', 'Request not found.', 404);
  if (existing.status !== 'pending') return failure('REQUEST_NOT_PENDING', 'This request is no longer pending.', 409);

  const db = getCoreDb();

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Atomically update request status to accepted
      const [updated] = await tx
        .update(teamRequests)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(and(eq(teamRequests.id, id), eq(teamRequests.status, 'pending')))
        .returning();

      if (!updated) {
        throw new Error('REQUEST_NOT_PENDING');
      }

      // 2. Add member to team if associated with a team
      if (updated.teamId) {
        await tx
          .insert(teamMembers)
          .values({
            teamId: updated.teamId,
            userId: updated.fromUserId,
            role: updated.roleOffered ?? null,
          })
          .onConflictDoNothing();
      }

      // 3. Atomically get or create canonical conversation between accepter and requester
      const conversation = await getOrCreateConversation(userId, updated.fromUserId, tx);

      // 4. Fetch requester profile info for the client response
      const [requester] = await tx
        .select({
          id: profiles.id,
          username: profiles.username,
          fullName: profiles.fullName,
        })
        .from(profiles)
        .where(eq(profiles.id, updated.fromUserId))
        .limit(1);

      // 5. Notification with direct link to messages conversation
      await tx
        .insert(notifications)
        .values({
          userId: updated.fromUserId,
          type: 'request_accepted',
          title: 'Request accepted',
          message: 'Your collaboration request was accepted.',
          href: `/messages?conversationId=${conversation.id}`,
          dedupeKey: `request:${id}:accepted`,
        })
        .onConflictDoNothing();

      // 6. Outbox event for asynchronous consumers
      await tx.insert(outboxEvents).values({
        eventType: 'team_request.accepted',
        aggregateType: 'team_request',
        aggregateId: id,
        payload: {
          fromUserId: updated.fromUserId,
          toUserId: updated.toUserId,
          conversationId: conversation.id,
        },
      });

      return {
        request: updated,
        conversation: {
          id: conversation.id,
          otherUser: {
            id: requester?.id ?? updated.fromUserId,
            username: requester?.username ?? '',
            fullName: requester?.fullName ?? '',
          },
        },
      };
    });

    return success(result);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'REQUEST_NOT_PENDING') {
      return failure('REQUEST_NOT_PENDING', 'This request is no longer pending.', 409);
    }
    console.error('Accept request transaction failed:', err);
    return failure('DATABASE_ERROR', 'Failed to accept collaboration request.', 500);
  }
}

