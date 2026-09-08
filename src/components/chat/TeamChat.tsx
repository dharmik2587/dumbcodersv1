'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, MessageSquare, AlertCircle } from 'lucide-react';

type MessageItem = {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  authorName: string | null;
  authorUsername: string;
  authorAvatar: string | null;
  authorStudentCode: string | null;
};

export function TeamChat({ teamId, currentUserId }: { teamId: string; currentUserId: string }) {
  const [content, setContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading, error } = useQuery<MessageItem[]>({
    queryKey: ['team-messages', teamId],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamId}/messages`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || `Failed to load messages (${res.status})`);
      }
      const body = await res.json();
      return body.data;
    },
    refetchInterval: 3000,
    enabled: Boolean(teamId),
  });

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/teams/${teamId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || `Failed to send message (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-messages', teamId] });
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
        {isLoading && (
          <p className="text-center text-[12px] text-fg3 animate-pulse">loading messages…</p>
        )}

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
              </div>
              <div
                className={`max-w-[75%] px-3.5 py-2 text-[13px] leading-relaxed ${
                  isMe
                    ? 'bg-accent text-white'
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
