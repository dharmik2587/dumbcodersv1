'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, MessageSquare, AlertCircle } from 'lucide-react';
import { subscribeChannel } from '@/client/lib/pusher-client';
import { supabase } from '@/client/lib/auth';

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {}
  return {};
}

type MessageItem = {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  authorName: string | null;
  authorUsername: string;
  authorAvatar: string | null;
  authorStudentCode: string | null;
  status?: 'sending' | 'sent' | 'failed';
};

function TeamMessagesSkeleton() {
  return (
    <div className="space-y-4 p-2 animate-pulse">
      <div className="flex flex-col items-start max-w-[75%] space-y-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-3 w-16 rounded bg-raised" />
          <div className="h-2.5 w-10 rounded bg-raised/60" />
        </div>
        <div className="h-9 w-48 rounded border border-line bg-raised" />
      </div>

      <div className="flex flex-col items-end ml-auto max-w-[75%] space-y-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-3 w-14 rounded bg-raised" />
          <div className="h-2.5 w-10 rounded bg-raised/60" />
        </div>
        <div className="h-12 w-60 rounded border border-accent/20 bg-accent/20" />
      </div>

      <div className="flex flex-col items-start max-w-[70%] space-y-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-3 w-20 rounded bg-raised" />
          <div className="h-2.5 w-10 rounded bg-raised/60" />
        </div>
        <div className="h-8 w-40 rounded border border-line bg-raised" />
      </div>
    </div>
  );
}

export function TeamChat({ teamId, currentUserId }: { teamId: string; currentUserId: string }) {
  const [content, setContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Load team messages without aggressive polling; relies on Pusher real-time events + focus fallback
  const { data: messages, isLoading, error } = useQuery<MessageItem[]>({
    queryKey: ['team-messages', teamId],
    queryFn: async () => {
      const authHeader = await getAuthHeader();
      const res = await fetch(`/api/teams/${teamId}/messages`, {
        headers: { ...authHeader },
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || `Failed to load messages (${res.status})`);
      }
      const body = await res.json();
      return (body.data as MessageItem[]).map((m) => ({ ...m, status: 'sent' as const }));
    },
    refetchOnWindowFocus: true,
    enabled: Boolean(teamId),
  });

  // Pusher real-time accelerated subscription (replaces 3s polling loop)
  useEffect(() => {
    if (!teamId) return;

    const channelName = `team-${teamId}`;
    const unsubscribe = subscribeChannel<MessageItem>(channelName, 'new_message', (newMsg) => {
      queryClient.setQueryData<MessageItem[]>(['team-messages', teamId], (old = []) => {
        // Prevent duplicate appending
        if (old.some((m) => m.id === newMsg.id)) {
          return old;
        }
        // If an optimistic message from this user with matching content exists, reconcile it
        const matchingOptimisticIndex = old.findIndex(
          (m) => m.userId === newMsg.userId && m.content === newMsg.content && m.status === 'sending'
        );
        if (matchingOptimisticIndex !== -1) {
          const updated = [...old];
          updated[matchingOptimisticIndex] = { ...newMsg, status: 'sent' };
          return updated;
        }
        return [...old, { ...newMsg, status: 'sent' }];
      });
    });

    return () => {
      unsubscribe();
    };
  }, [teamId, queryClient]);

  // Optimistic sending mutation
  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const authHeader = await getAuthHeader();
      const res = await fetch(`/api/teams/${teamId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        credentials: 'include',
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || `Failed to send message (${res.status})`);
      }
      return res.json();
    },
    onMutate: async (text: string) => {
      await queryClient.cancelQueries({ queryKey: ['team-messages', teamId] });
      const previousMessages = queryClient.getQueryData<MessageItem[]>(['team-messages', teamId]) || [];

      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: MessageItem = {
        id: tempId,
        content: text,
        createdAt: new Date().toISOString(),
        userId: currentUserId,
        authorName: null,
        authorUsername: 'You',
        authorAvatar: null,
        authorStudentCode: null,
        status: 'sending',
      };

      queryClient.setQueryData<MessageItem[]>(['team-messages', teamId], [...previousMessages, optimisticMsg]);
      return { previousMessages, tempId };
    },
    onSuccess: (data, _variables, context) => {
      if (data?.data && context?.tempId) {
        queryClient.setQueryData<MessageItem[]>(['team-messages', teamId], (old = []) =>
          old.map((m) => (m.id === context.tempId ? { ...data.data, status: 'sent' } : m))
        );
      }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['team-messages', teamId], context.previousMessages);
      }
    },
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || sendMutation.isPending) return;
    setContent('');
    sendMutation.mutate(text);
  };

  return (
    <div className="flex h-[520px] flex-col border border-line bg-surface overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-accent" />
          <span className="mono-label text-fg">team chat</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg3">
          {messages?.length ?? 0} messages
        </span>
      </div>

      {/* Messages viewport */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {isLoading && <TeamMessagesSkeleton />}

        {error && (
          <div className="flex items-center gap-2 border border-amber-line bg-amber-soft px-3 py-2 text-[12px] text-amber">
            <AlertCircle size={13} />
            <span>{error instanceof Error ? error.message : 'Could not load messages'}</span>
          </div>
        )}

        {!isLoading && !error && (!messages || messages.length === 0) && (
          <div className="flex h-full flex-col items-center justify-center text-center text-fg3">
            <MessageSquare size={28} strokeWidth={1} className="text-fg3/40" />
            <p className="mt-3 text-[12.5px]">No messages yet. Start the conversation.</p>
          </div>
        )}

        {messages?.map((msg) => {
          const isMe = msg.userId === currentUserId;
          const isSending = msg.status === 'sending';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-medium text-fg2">
                  {msg.authorName || msg.authorUsername}
                </span>
                {msg.authorStudentCode && (
                  <span className="font-mono text-[9px] border border-line px-1 py-0.5 text-fg3">
                    {msg.authorStudentCode}
                  </span>
                )}
                <span className="font-mono text-[9px] text-fg3">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isSending && (
                  <span className="font-mono text-[8px] text-accent animate-pulse">sending...</span>
                )}
              </div>
              <div
                className={`max-w-[75%] px-3.5 py-2 text-[13px] leading-relaxed transition-opacity ${
                  isMe
                    ? isSending
                      ? 'bg-accent/70 text-white'
                      : 'bg-accent text-white'
                    : 'border border-line bg-raised text-fg'
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={handleSend} className="border-t border-line p-3 bg-raised">
        <div className="flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 border border-line bg-surface px-3.5 py-2 text-[13px] text-fg placeholder:text-fg3/50 outline-none transition-colors focus:border-accent-line"
          />
          <button
            type="submit"
            disabled={!content.trim() || sendMutation.isPending}
            className="flex items-center gap-1.5 bg-accent px-4 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Send size={13} />
          </button>
        </div>
        {sendMutation.isError && (
          <p className="mt-1.5 text-[11px] text-danger">
            {sendMutation.error instanceof Error ? sendMutation.error.message : 'Failed to send'}
          </p>
        )}
      </form>
    </div>
  );
}
