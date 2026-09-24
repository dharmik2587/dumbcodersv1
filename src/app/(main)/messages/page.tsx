'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { Send, MessageSquare, Search, User, ArrowLeft, ShieldCheck, CheckCheck, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useMe } from '@/client/store/apiStore';
import { subscribeChannel } from '@/client/lib/pusher-client';

interface ConversationItem {
  id: string;
  partnerId: string;
  partnerName: string | null;
  partnerUsername: string;
  partnerAvatar: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface MessageItem {
  id: string;
  clientMessageId?: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  senderName: string | null;
  senderUsername: string;
  senderAvatar: string | null;
  status?: 'sending' | 'sent' | 'failed';
  error?: string;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function MessagesContent() {
  const me = useMe();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get('userId');
  const initialConversationId = searchParams.get('conversationId');
  const queryClient = useQueryClient();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId);
  const [filter, setFilter] = useState('');
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch user conversations (event-accelerated, fallback on window focus)
  const { data: conversations, isLoading: loadingConversations } = useQuery<ConversationItem[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch('/api/messages', { credentials: 'include' });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message ?? 'Failed to load conversations');
      return body.data;
    },
    refetchOnWindowFocus: true,
  });

  // Sync conversationId from query param
  useEffect(() => {
    if (initialConversationId) {
      setActiveConversationId(initialConversationId);
      setTimeout(() => composerInputRef.current?.focus(), 100);
    }
  }, [initialConversationId]);

  // 2. If ?userId= was passed, start or focus that conversation
  const startMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recipientId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message ?? 'Failed to open conversation');
      return body.data as { id: string };
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setActiveConversationId(data.id);
      router.replace('/messages');
      setTimeout(() => composerInputRef.current?.focus(), 100);
    },
  });

  useEffect(() => {
    if (initialUserId && me?.id && initialUserId !== me.id) {
      startMutation.mutate(initialUserId);
    }
  }, [initialUserId, me?.id, startMutation]);

  // Default to initialConversationId or first conversation if none selected
  useEffect(() => {
    if (initialConversationId) {
      setActiveConversationId(initialConversationId);
    } else if (!activeConversationId && conversations && conversations.length > 0 && !initialUserId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId, initialUserId, initialConversationId]);

  const activeConvo = conversations?.find((c) => c.id === activeConversationId);

  // 3. Fetch active conversation messages (event-accelerated, fallback on window focus)
  const { data: messages, isLoading: loadingMessages } = useQuery<MessageItem[]>({
    queryKey: ['messages', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return [];
      const res = await fetch(`/api/messages/${activeConversationId}`, { credentials: 'include' });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message ?? 'Failed to load messages');
      return (body.data as MessageItem[]).map((m) => ({ ...m, status: 'sent' }));
    },
    enabled: Boolean(activeConversationId),
    refetchOnWindowFocus: true,
  });

  // 4. Send message mutation with Optimistic UI and Retry capabilities
  const sendMutation = useMutation({
    mutationFn: async ({
      convoId,
      text,
      clientMessageId,
    }: {
      convoId: string;
      text: string;
      clientMessageId: string;
    }) => {
      const res = await fetch(`/api/messages/${convoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: text, clientMessageId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message ?? 'Failed to send message');
      return body.data as MessageItem;
    },
    onMutate: async ({ convoId, text, clientMessageId }) => {
      // Cancel outgoing fetches to avoid overwriting optimistic message
      await queryClient.cancelQueries({ queryKey: ['messages', convoId] });

      const previousMessages = queryClient.getQueryData<MessageItem[]>(['messages', convoId]) || [];

      const optimisticMsg: MessageItem = {
        id: clientMessageId,
        clientMessageId,
        conversationId: convoId,
        senderId: me?.id || '',
        content: text,
        readAt: null,
        createdAt: new Date().toISOString(),
        senderName: me?.name || null,
        senderUsername: me?.handle || '',
        senderAvatar: me?.avatarUrl || null,
        status: 'sending',
      };

      // Optimistically append to thread
      queryClient.setQueryData<MessageItem[]>(['messages', convoId], [...previousMessages, optimisticMsg]);

      // Optimistically update conversations list
      queryClient.setQueryData<ConversationItem[]>(['conversations'], (old = []) => {
        return old.map((c) =>
          c.id === convoId
            ? { ...c, lastMessage: text, lastMessageAt: new Date().toISOString() }
            : c
        );
      });

      return { previousMessages, clientMessageId };
    },
    onSuccess: (savedMessage, { convoId, clientMessageId }) => {
      // Reconcile optimistic message with canonical message from server
      queryClient.setQueryData<MessageItem[]>(['messages', convoId], (old = []) => {
        return old.map((m) =>
          m.id === clientMessageId || m.clientMessageId === clientMessageId
            ? { ...savedMessage, status: 'sent' }
            : m
        );
      });
    },
    onError: (err, { convoId, clientMessageId }) => {
      // Mark optimistic message as failed with error details for retry
      queryClient.setQueryData<MessageItem[]>(['messages', convoId], (old = []) => {
        return old.map((m) =>
          m.id === clientMessageId || m.clientMessageId === clientMessageId
            ? { ...m, status: 'failed', error: err instanceof Error ? err.message : 'Failed to deliver' }
            : m
        );
      });
    },
  });

  // 5. Pusher subscription for real-time incoming messages on private channel
  useEffect(() => {
    if (!me?.id) return;
    const unsubscribe = subscribeChannel<{
      messageId: string;
      conversationId: string;
      senderId: string;
      content: string;
      createdAt: string;
    }>(`private-user-${me.id}`, 'direct-message', (payload) => {
      // If the incoming message belongs to currently open conversation, append directly to cache
      if (activeConversationId && payload.conversationId === activeConversationId) {
        queryClient.setQueryData<MessageItem[]>(['messages', activeConversationId], (old = []) => {
          // Avoid duplicate insertion
          if (
            old.some(
              (m) =>
                m.id === payload.messageId ||
                (m.clientMessageId && m.clientMessageId === payload.messageId)
            )
          ) {
            return old;
          }
          const incoming: MessageItem = {
            id: payload.messageId,
            conversationId: payload.conversationId,
            senderId: payload.senderId,
            content: payload.content,
            readAt: new Date().toISOString(),
            createdAt: payload.createdAt,
            senderName: null,
            senderUsername: '',
            senderAvatar: null,
            status: 'sent',
          };
          return [...old, incoming];
        });
      }

      // Update conversations sidebar incrementally
      queryClient.setQueryData<ConversationItem[]>(['conversations'], (old = []) => {
        let found = false;
        const updated = old.map((c) => {
          if (c.id === payload.conversationId) {
            found = true;
            return {
              ...c,
              lastMessage: payload.content,
              lastMessageAt: payload.createdAt,
              unreadCount:
                payload.conversationId === activeConversationId || payload.senderId === me.id
                  ? c.unreadCount
                  : c.unreadCount + 1,
            };
          }
          return c;
        });

        if (!found) {
          void queryClient.invalidateQueries({ queryKey: ['conversations'] });
          return old;
        }

        return updated.sort((a, b) => {
          const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return timeB - timeA;
        });
      });
    });

    return () => {
      unsubscribe();
    };
  }, [me?.id, activeConversationId, queryClient]);

  // Scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = messageText.trim();
    if (!text || !activeConversationId) return;

    const clientMessageId = generateUUID();
    setMessageText('');
    sendMutation.mutate({ convoId: activeConversationId, text, clientMessageId });
  };

  const handleRetry = (msg: MessageItem) => {
    if (!activeConversationId) return;
    const newId = generateUUID();
    // Remove failed item and re-send
    queryClient.setQueryData<MessageItem[]>(['messages', activeConversationId], (old = []) =>
      old.filter((m) => m.id !== msg.id)
    );
    sendMutation.mutate({ convoId: activeConversationId, text: msg.content, clientMessageId: newId });
  };

  const filteredConversations = (conversations || []).filter((c) => {
    const q = filter.toLowerCase();
    return (
      (c.partnerName && c.partnerName.toLowerCase().includes(q)) ||
      c.partnerUsername.toLowerCase().includes(q) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  });

  return (
    <div className="mx-auto max-w-[1400px] h-[calc(100vh-140px)] min-h-[600px] flex flex-col">
      {/* Header */}
      <div className="border-b border-line pb-4 mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-accent">Communications</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] text-accent">
              <ShieldCheck size={11} /> pgcrypto encrypted
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Direct Messages</h1>
        </div>
      </div>

      {/* Main chat layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 rounded-2xl border border-line bg-surface overflow-hidden shadow-xl">
        {/* Sidebar */}
        <div className={`md:col-span-4 border-r border-line flex flex-col bg-surface/80 ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3.5 border-b border-line">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search conversations…"
                className="w-full rounded-xl border border-line bg-raised py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-line/40">
            {loadingConversations && (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-raised animate-pulse" />
                ))}
              </div>
            )}

            {!loadingConversations && filteredConversations.length === 0 && (
              <div className="p-8 text-center text-muted">
                <MessageSquare size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs">No conversations yet.</p>
                <p className="mt-1 font-mono text-[10px] text-subtle">Message a builder from Find Partners.</p>
              </div>
            )}

            {filteredConversations.map((c) => {
              const isActive = c.id === activeConversationId;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveConversationId(c.id)}
                  className={`w-full flex items-start gap-3 p-3.5 text-left transition-all ${
                    isActive
                      ? 'bg-accent/10 border-l-2 border-accent'
                      : 'hover:bg-raised/60'
                  }`}
                >
                  <div className="relative h-10 w-10 shrink-0 rounded-full border border-line overflow-hidden bg-raised flex items-center justify-center">
                    {c.partnerAvatar ? (
                      <Image
                        src={c.partnerAvatar}
                        alt={c.partnerUsername}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={18} className="text-muted" />
                    )}
                    {c.unreadCount > 0 && (
                      <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-surface" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`truncate text-xs font-semibold ${isActive ? 'text-accent' : 'text-foreground'}`}>
                        {c.partnerName || c.partnerUsername}
                      </p>
                      {c.lastMessageAt && (
                        <span className="font-mono text-[9px] text-muted shrink-0 ml-1">
                          {new Date(c.lastMessageAt).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <p className="truncate font-mono text-[10px] text-muted">@{c.partnerUsername}</p>
                    <p className="mt-1 truncate text-xs text-subtle">
                      {c.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Thread */}
        <div className={`md:col-span-8 flex flex-col bg-surface ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
          {activeConvo ? (
            <>
              {/* Chat Thread Header */}
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-raised/40">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveConversationId(null)}
                    className="md:hidden text-muted hover:text-foreground"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className="relative h-9 w-9 rounded-full border border-line overflow-hidden bg-raised flex items-center justify-center">
                    {activeConvo.partnerAvatar ? (
                      <Image
                        src={activeConvo.partnerAvatar}
                        alt={activeConvo.partnerUsername}
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={16} className="text-muted" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      {activeConvo.partnerName || activeConvo.partnerUsername}
                    </h2>
                    <p className="font-mono text-[10px] text-muted">@{activeConvo.partnerUsername}</p>
                  </div>
                </div>

                <Link
                  href={`/b/${activeConvo.partnerId}`}
                  className="rounded-xl border border-line bg-raised/60 px-3 py-1.5 font-mono text-xs text-subtle hover:text-accent hover:border-accent transition-colors"
                >
                  View Profile
                </Link>
              </div>

              {/* Messages viewport */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {loadingMessages && (
                  <div className="space-y-4 py-4 animate-pulse">
                    <div className="flex flex-col items-start max-w-[60%]">
                      <div className="h-9 w-48 rounded-2xl rounded-bl-none bg-raised border border-line" />
                      <div className="h-2.5 w-12 rounded bg-raised mt-1.5 ml-1" />
                    </div>
                    <div className="flex flex-col items-end ml-auto max-w-[60%]">
                      <div className="h-12 w-64 rounded-2xl rounded-br-none bg-accent/20 border border-accent/20" />
                      <div className="h-2.5 w-12 rounded bg-raised mt-1.5 mr-1" />
                    </div>
                    <div className="flex flex-col items-start max-w-[50%]">
                      <div className="h-8 w-36 rounded-2xl rounded-bl-none bg-raised border border-line" />
                      <div className="h-2.5 w-12 rounded bg-raised mt-1.5 ml-1" />
                    </div>
                  </div>
                )}

                {!loadingMessages && (!messages || messages.length === 0) && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted p-6">
                    <MessageSquare size={36} className="text-accent mb-3" />
                    <p className="text-sm font-semibold text-foreground">You are now connected.</p>
                    <p className="text-xs text-subtle mt-1">Start the conversation with {activeConvo.partnerName || activeConvo.partnerUsername}.</p>
                    <p className="font-mono text-[10px] text-muted mt-2">End-to-end encrypted at rest via pgcrypto.</p>
                  </div>
                )}

                {messages?.map((msg) => {
                  const isMe = msg.senderId === me?.id;
                  const isSending = msg.status === 'sending';
                  const isFailed = msg.status === 'failed';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm transition-all ${
                          isMe
                            ? isFailed
                              ? 'bg-red-500/20 border border-red-500/40 text-red-200 rounded-br-none'
                              : isSending
                                ? 'bg-accent/70 text-black font-medium rounded-br-none opacity-80'
                                : 'bg-accent text-black font-medium rounded-br-none'
                            : 'border border-line bg-raised text-foreground rounded-bl-none'
                        }`}
                      >
                        {msg.content}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1 px-1 font-mono text-[9px] text-muted">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        {isMe && (
                          <>
                            {isSending && (
                              <span className="flex items-center gap-1 text-accent font-mono text-[9px]">
                                <Loader2 size={10} className="animate-spin" />
                                <span>sending...</span>
                              </span>
                            )}
                            {isFailed && (
                              <span className="flex items-center gap-1.5 text-red-400">
                                <AlertCircle size={10} />
                                <span>Failed to send</span>
                                <button
                                  type="button"
                                  onClick={() => handleRetry(msg)}
                                  className="underline hover:text-red-300 font-semibold cursor-pointer inline-flex items-center gap-0.5 ml-1"
                                >
                                  <RefreshCw size={8} /> Retry
                                </button>
                              </span>
                            )}
                            {!isSending && !isFailed && msg.readAt && (
                              <CheckCheck size={11} className="text-accent ml-0.5" />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <form onSubmit={handleSend} className="border-t border-line p-3 bg-raised/50">
                <div className="flex gap-2">
                  <input
                    ref={composerInputRef}
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type an encrypted message…"
                    maxLength={2000}
                    className="flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                  >
                    <Send size={13} />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted p-8">
              <MessageSquare size={40} className="opacity-30 mb-3" />
              <p className="text-sm font-medium">Select a conversation</p>
              <p className="text-xs text-subtle mt-1">Pick a teammate or builder from the list to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-muted font-mono text-xs animate-pulse">Loading messenger…</div>}>
      <MessagesContent />
    </Suspense>
  );
}
