import { and, desc, eq, or, sql } from 'drizzle-orm';
import { getCoreDb } from '../core';
import { conversations, directMessages, outboxEvents, profiles } from '../schema/core';
import { sqlDecrypt, sqlEncrypt } from '@/lib/crypto';

export interface ConversationWithParticipant {
  id: string;
  partnerId: string;
  partnerName: string | null;
  partnerUsername: string;
  partnerAvatar: string | null;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
}

export interface DirectMessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: Date | null;
  createdAt: Date;
  senderName: string | null;
  senderUsername: string;
  senderAvatar: string | null;
}

/**
 * Normalizes two user IDs so userAId < userBId to ensure unique pair conversations.
 */
function normalizePair(u1: string, u2: string): [string, string] {
  return u1 < u2 ? [u1, u2] : [u2, u1];
}

/**
 * Gets or creates a conversation between two users.
 */
export async function getOrCreateConversation(user1Id: string, user2Id: string) {
  if (user1Id === user2Id) {
    throw new Error('Cannot start a conversation with yourself.');
  }

  const [userAId, userBId] = normalizePair(user1Id, user2Id);
  const db = getCoreDb();

  const existing = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userAId, userAId), eq(conversations.userBId, userBId)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  try {
    const [created] = await db
      .insert(conversations)
      .values({
        userAId,
        userBId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    if (created) {
      return created;
    }
  } catch {
    // Unique collision handled by fallback fetch
  }

  const [fallback] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userAId, userAId), eq(conversations.userBId, userBId)))
    .limit(1);

  if (!fallback) {
    throw new Error('Failed to retrieve conversation after collision.');
  }

  return fallback;
}

export async function createOutboxEvent({
  eventType,
  aggregateType,
  aggregateId,
  payload,
  status = 'pending',
  attempts = 0,
  processedAt = null,
}: {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  status?: string;
  attempts?: number;
  processedAt?: Date | null;
}) {
  const db = getCoreDb();
  const [event] = await db
    .insert(outboxEvents)
    .values({
      eventType,
      aggregateType,
      aggregateId,
      payload,
      status,
      attempts,
      availableAt: new Date(),
      processedAt,
      createdAt: new Date(),
    })
    .returning();
  return event;
}


/**
 * Lists all conversations for a user with participant profiles and latest messages.
 */
export async function listUserConversations(userId: string): Promise<ConversationWithParticipant[]> {
  const db = getCoreDb();

  const convos = await db
    .select()
    .from(conversations)
    .where(or(eq(conversations.userAId, userId), eq(conversations.userBId, userId)))
    .orderBy(desc(conversations.updatedAt));

  const result: ConversationWithParticipant[] = [];

  for (const convo of convos) {
    const partnerId = convo.userAId === userId ? convo.userBId : convo.userAId;

    const [partner] = await db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        username: profiles.username,
        avatarUrl: profiles.avatarUrl,
      })
      .from(profiles)
      .where(eq(profiles.id, partnerId))
      .limit(1);

    const [lastMsg] = await db
      .select({
        content: sqlDecrypt(directMessages.content),
        createdAt: directMessages.createdAt,
      })
      .from(directMessages)
      .where(eq(directMessages.conversationId, convo.id))
      .orderBy(desc(directMessages.createdAt))
      .limit(1);

    const [unread] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(directMessages)
      .where(
        and(
          eq(directMessages.conversationId, convo.id),
          sql`${directMessages.senderId} != ${userId}`,
          sql`${directMessages.readAt} IS NULL`
        )
      );

    result.push({
      id: convo.id,
      partnerId,
      partnerName: partner?.fullName ?? partner?.username ?? 'Builder',
      partnerUsername: partner?.username ?? 'builder',
      partnerAvatar: partner?.avatarUrl ?? null,
      lastMessage: lastMsg?.content ?? null,
      lastMessageAt: lastMsg?.createdAt ?? convo.updatedAt,
      unreadCount: unread?.count ?? 0,
    });
  }

  return result;
}

/**
 * Lists messages in a conversation and automatically marks incoming messages as read.
 */
export async function listConversationMessages(
  conversationId: string,
  userId: string,
  limit = 50,
  offset = 0
): Promise<DirectMessageItem[]> {
  const db = getCoreDb();

  // Participant check
  const [convo] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!convo || (convo.userAId !== userId && convo.userBId !== userId)) {
    throw new Error('Unauthorized: You are not a participant in this conversation.');
  }

  // Mark unread messages from the other user as read
  await db
    .update(directMessages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(directMessages.conversationId, conversationId),
        sql`${directMessages.senderId} != ${userId}`,
        sql`${directMessages.readAt} IS NULL`
      )
    );

  const messages = await db
    .select({
      id: directMessages.id,
      conversationId: directMessages.conversationId,
      senderId: directMessages.senderId,
      content: sqlDecrypt(directMessages.content),
      readAt: directMessages.readAt,
      createdAt: directMessages.createdAt,
      senderName: profiles.fullName,
      senderUsername: profiles.username,
      senderAvatar: profiles.avatarUrl,
    })
    .from(directMessages)
    .innerJoin(profiles, eq(directMessages.senderId, profiles.id))
    .where(eq(directMessages.conversationId, conversationId))
    .orderBy(directMessages.createdAt)
    .limit(limit)
    .offset(offset);

  return messages;
}

/**
 * Sends a direct message inside a conversation with pgcrypto encryption at rest.
 */
export async function sendDirectMessage(
  conversationId: string,
  senderId: string,
  content: string
) {
  const db = getCoreDb();

  // Verify participant
  const [convo] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!convo || (convo.userAId !== senderId && convo.userBId !== senderId)) {
    throw new Error('Unauthorized: You cannot post in this conversation.');
  }

  const recipientId = convo.userAId === senderId ? convo.userBId : convo.userAId;
  const now = new Date();

  const [msg] = await db
    .insert(directMessages)
    .values({
      conversationId,
      senderId,
      content: sqlEncrypt(content) as unknown as string,
      createdAt: now,
    })
    .returning({
      id: directMessages.id,
      conversationId: directMessages.conversationId,
      senderId: directMessages.senderId,
      content: sqlDecrypt(directMessages.content),
      readAt: directMessages.readAt,
      createdAt: directMessages.createdAt,
    });

  // Touch conversation updatedAt
  await db
    .update(conversations)
    .set({ updatedAt: now })
    .where(eq(conversations.id, conversationId));

  return { message: msg, recipientId };
}
