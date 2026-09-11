'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { Send, MessageSquare, Search, User, ArrowLeft, ShieldCheck, CheckCheck } from 'lucide-react';
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
  conversationId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  senderName: string | null;
  senderUsername: string;
  senderAvatar: string | null;
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

  // 1. Fetch user conversations
  const { data: conversations, isLoading: loadingConversations } = useQuery<ConversationItem[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch('/api/messages', { credentials: 'include' });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message ?? 'Failed to load conversations');
      return body.data;
    },
    refetchInterval: 5000,
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
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setActiveConversationId(data.id);
      router.replace('/messages');
      setTimeout(() => composerInputRef.current?.focus(), 100);
    },
  });

  useEffect(() => {
    if (initialUserId && me?.id && initialUserId !== me.id) {
      startMutation.mutate(initialUserId);
    }
  }, [initialUserId, me?.id]);

  // Default to initialConversationId or first conversation if none selected
  useEffect(() => {
    if (initialConversationId) {
      setActiveConversationId(initialConversationId);
    } else if (!activeConversationId && conversations && conversations.length > 0 && !initialUserId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId, initialUserId, initialConversationId]);

  const activeConvo = conversations?.find((c) => c.id === activeConversationId);

  // 3. Fetch active conversation messages
  const { data: messages, isLoading: loadingMessages } = useQuery<MessageItem[]>({
    queryKey: ['messages', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return [];
      const res = await fetch(`/api/messages/${activeConversationId}`, { credentials: 'include' });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message ?? 'Failed to load messages');
      return body.data;
    },
    enabled: Boolean(activeConversationId),
    refetchInterval: 3000,
  });

  // 4. Send message mutation
  const sendMutation = useMutation({
    mutationFn: async ({ convoId, text }: { convoId: string; text: string }) => {
      const res = await fetch(`/api/messages/${convoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: text }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message ?? 'Failed to send message');
      return body.data;
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Pusher subscription for live incoming messages on private authenticated channel
  useEffect(() => {
    if (!me?.id) return;
    const unsubscribe = subscribeChannel(`private-user-${me.id}`, 'direct-message', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (activeConversationId) {
        queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] });
      }
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
    if (!text || !activeConversationId || sendMutation.isPending) return;
    sendMutation.mutate({ convoId: activeConversationId, text });
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
                  <p className="text-center font-mono text-xs text-muted animate-pulse">Decrypting thread…</p>
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
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                          isMe
                            ? 'bg-accent text-black font-medium rounded-br-none'
                            : 'border border-line bg-raised text-foreground rounded-bl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-1 mt-1 px-1 font-mono text-[9px] text-muted">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && msg.readAt && (
                          <CheckCheck size={11} className="text-accent ml-0.5" />
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
                    disabled={!messageText.trim() || sendMutation.isPending}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                  >
                    <Send size={13} />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
                {sendMutation.isError && (
                  <p className="mt-1.5 font-mono text-[10px] text-red-400">
                    {sendMutation.error.message}
                  </p>
                )}
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
