import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUserId } from '@/lib/auth/server';
import { enforceRateLimit } from '@/lib/ratelimit';
import { failure, success } from '@/lib/http';
import { getOrCreateConversation, listUserConversations } from '@/lib/db/queries/messages';

const startConversationSchema = z.object({
  recipientId: z.string().min(1, 'recipientId is required'),
});

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return failure('UNAUTHORIZED', 'Sign in to continue.', 401);
  }

  try {
    const conversations = await listUserConversations(userId);
    return success(conversations);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch conversations';
    return failure('INTERNAL_ERROR', msg, 500);
  }
}

export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return failure('UNAUTHORIZED', 'Sign in to continue.', 401);
  }

  const rateCheck = await enforceRateLimit(`msg:start:${userId}`, 20, 60);
  if (!rateCheck.success) {
    return rateCheck.response!;
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = startConversationSchema.safeParse(body);

    if (!parsed.success) {
      return failure('BAD_REQUEST', 'Invalid request payload. Expected recipientId.', 400);
    }

    if (parsed.data.recipientId === userId) {
      return failure('BAD_REQUEST', 'Cannot start a conversation with yourself.', 400);
    }

    const conversation = await getOrCreateConversation(userId, parsed.data.recipientId);
    return success(conversation, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to initialize conversation';
    return failure('INTERNAL_ERROR', msg, 500);
  }
}
