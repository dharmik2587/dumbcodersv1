import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUserId } from '@/lib/auth/server';
import { enforceRateLimit } from '@/lib/ratelimit';
import { failure, success } from '@/lib/http';
import { getOrCreateConversation, listUserConversations } from '@/lib/db/queries/messages';

const startConversationSchema = z.object({
  recipientId: z.string().min(1, 'recipientId is required'),
});

import { withApiHandler } from '@/lib/api/with-api-handler';

export const GET = withApiHandler(
  { api: 'messages', requireAuth: true },
  async ({ userId }) => {
    const conversations = await listUserConversations(userId!);
    return success(conversations);
  }
);

export const POST = withApiHandler(
  { api: 'messages', operation: 'startConversation', requireAuth: true },
  async ({ req, userId }) => {
    const rateCheck = await enforceRateLimit(`msg:start:${userId}`, 20, 60);
    if (!rateCheck.success) {
      return rateCheck.response!;
    }

    const body = await req.json().catch(() => null);
    const parsed = startConversationSchema.safeParse(body);

    if (!parsed.success) {
      return failure('BAD_REQUEST', 'Invalid request payload. Expected recipientId.', 400);
    }

    if (parsed.data.recipientId === userId) {
      return failure('BAD_REQUEST', 'Cannot start a conversation with yourself.', 400);
    }

    const conversation = await getOrCreateConversation(userId!, parsed.data.recipientId);
    return success(conversation, { status: 201 });
  }
);
