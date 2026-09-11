import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUserId } from '@/lib/auth/server';
import { enforceRateLimit } from '@/lib/ratelimit';
import { failure, success } from '@/lib/http';
import { createOutboxEvent, listConversationMessages, sendDirectMessage } from '@/lib/db/queries/messages';
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

    // Notify recipient via Pusher on private authorized channel
    const pusherChannel = `private-user-${recipientId}`;
    const pusherPayload = {
      messageId: message.id,
      conversationId,
      senderId: userId,
      content: message.content,
      createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt,
    };

    const pusherResult = await triggerPusherEvent(pusherChannel, 'direct-message', pusherPayload);

    // Write to outbox_events to guarantee auditability and retry capability
    try {
      await createOutboxEvent({
        eventType: 'pusher.dm',
        aggregateType: 'direct_message',
        aggregateId: message.id,
        payload: {
          channel: pusherChannel,
          event: 'direct-message',
          data: pusherPayload,
        },
        status: pusherResult.success ? 'processed' : 'pending',
        attempts: 1,
        processedAt: pusherResult.success ? new Date() : null,
      });
    } catch (outboxError) {
      console.error('[DM Outbox] Failed to record outbox event:', outboxError);
    }

    // Always return HTTP 201 as message is safely committed to Postgres
    return success(message, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to send message';
    const status = msg.includes('Unauthorized') ? 403 : 500;
    return failure('INTERNAL_ERROR', msg, status);
  }
}

