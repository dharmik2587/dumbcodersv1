import { get, post, ApiResponse } from './client';

export interface Conversation {
  id: string;
  conversationId?: string;
  partnerId: string;
  partnerName: string | null;
  partnerUsername: string;
  partnerAvatar: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt?: string | null;
  createdAt: string;
  senderName?: string | null;
  senderUsername?: string;
  senderAvatar?: string | null;
}

export async function listConversations(): Promise<Conversation[]> {
  return get<ApiResponse<Conversation[]>>('/api/messages').then(res => res.data || []);
}

export async function startConversation(toUserId: string): Promise<{ id: string; conversationId: string }> {
  return post<ApiResponse<{ id: string; conversationId: string }>>('/api/messages', {
    recipientId: toUserId,
    toUserId,
  }).then(res => res.data!);
}

export async function getConversationMessages(conversationId: string): Promise<DirectMessage[]> {
  return get<ApiResponse<DirectMessage[]>>(`/api/messages/${conversationId}`).then(res => res.data || []);
}

export async function sendMessage(conversationId: string, content: string, clientMessageId?: string): Promise<DirectMessage> {
  return post<ApiResponse<DirectMessage>>(`/api/messages/${conversationId}`, {
    content,
    clientMessageId,
  }).then(res => res.data!);
}