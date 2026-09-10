import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUserId } from '@/lib/auth/server';
import { enforceRateLimit } from '@/lib/ratelimit';
import { failure, success } from '@/lib/http';
import { listConversationMessages, sendDirectMessage } from '@/lib/db/queries/messages';
import { triggerPusherEvent } from '@/lib/pusher';

const sendMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
});

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return failure('UNAUTHORIZED', 'Sign in to continue.', 401);
  }

  try {
    const { conversationId } = await context.params;
    const messages = await listConversationMessages(conversationId, userId);
    return success(messages);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch messages';
    const status = msg.includes('Unauthorized') ? 403 : 500;
    return failure('INTERNAL_ERROR', msg, status);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return failure('UNAUTHORIZED', 'Sign in to continue.', 401);
  }

  const rateCheck = await enforceRateLimit(`msg:send:${userId}`, 30, 60);
  if (!rateCheck.success) {
    return rateCheck.response!;
  }

  try {
    const { conversationId } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = sendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return failure('BAD_REQUEST', parsed.error.issues[0]?.message ?? 'Invalid message content.', 400);
    }

    const { message, recipientId } = await sendDirectMessage(
      conversationId,
      userId,
      parsed.data.content
    );

    // Notify recipient via Pusher
    void triggerPusherEvent(`user-${recipientId}`, 'direct-message', {
      conversationId,
      senderId: userId,
      messageId: message.id,
      createdAt: message.createdAt,
    });

    return success(message, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to send message';
    const status = msg.includes('Unauthorized') ? 403 : 500;
    return failure('INTERNAL_ERROR', msg, status);
  }
}
