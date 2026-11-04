import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getCoreDb } from '@/lib/db/core';
import { profiles } from '@/lib/db/schema/core';
import { requireUser } from '@/lib/auth/server';
import { ensureStudentProfile } from '@/lib/profile/student';
import { enforceRateLimit } from '@/lib/ratelimit';
import { failure, success } from '@/lib/http';
import { getOrCreateConversation, listUserConversations } from '@/lib/db/queries/messages';
import { withApiHandler } from '@/lib/api/with-api-handler';

const startConversationSchema = z
  .object({
    recipientId: z.string().optional(),
    toUserId: z.string().optional(),
  })
  .refine((data) => Boolean(data.recipientId || data.toUserId), {
    message: 'recipientId or toUserId is required',
  });

export const GET = withApiHandler(
  { api: 'messages', requireAuth: true },
  async ({ userId }) => {
    const user = await requireUser();
    await ensureStudentProfile(user);
    const conversations = await listUserConversations(userId!);
    return success(conversations);
  }
);

export const POST = withApiHandler(
  { api: 'messages', operation: 'startConversation', requireAuth: true },
  async ({ req, userId }) => {
    const user = await requireUser();
    await ensureStudentProfile(user);

    const rateCheck = await enforceRateLimit(`msg:start:${userId}`, 20, 60);
    if (!rateCheck.success) {
      return rateCheck.response!;
    }

    const body = await req.json().catch(() => null);
    const parsed = startConversationSchema.safeParse(body);

    if (!parsed.success) {
      return failure('BAD_REQUEST', 'Invalid request payload. Expected recipientId or toUserId.', 400);
    }

    const recipientId = (parsed.data.recipientId || parsed.data.toUserId)!.trim();

    if (recipientId === userId) {
      return failure('BAD_REQUEST', 'Cannot start a conversation with yourself.', 400);
    }

    const db = getCoreDb();
    const [recipient] = await db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        username: profiles.username,
        avatarUrl: profiles.avatarUrl,
      })
      .from(profiles)
      .where(eq(profiles.id, recipientId))
      .limit(1);

    if (!recipient) {
      return failure('NOT_FOUND', 'Recipient profile not found.', 404);
    }

    const conversation = await getOrCreateConversation(userId!, recipientId);

    return success(
      {
        ...conversation,
        conversationId: conversation.id,
        partnerId: recipient.id,
        partnerName: recipient.fullName ?? recipient.username ?? 'Builder',
        partnerUsername: recipient.username ?? 'builder',
        partnerAvatar: recipient.avatarUrl ?? null,
      },
      { status: 201 }
    );
  }
);
