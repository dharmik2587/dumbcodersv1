'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Undo2, Inbox, AlertCircle, Clock } from 'lucide-react';

interface RequestItem {
  request: {
    id: string;
    status: string;
    message: string | null;
    fromUserId: string;
    toUserId: string;
    createdAt?: string;
  };
  from: {
    username: string;
    fullName: string | null;
    avatarUrl?: string | null;
  };
  team: {
    name: string;
  } | null;
}

export function RequestInbox() {
  const queryClient = useQueryClient();

  const { data: requests, isLoading, error } = useQuery<RequestItem[]>({
    queryKey: ['requests', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/requests?direction=all', { credentials: 'include' });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error?.message ?? 'Could not load requests');
      }
      return body.data;
    },
  });

  const actMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'accept' | 'reject' | 'withdraw' }) => {
      const response = await fetch(`/api/requests/${id}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error?.message ?? `Failed to ${action} request`);
      }
      return body.data;
    },
    onMutate: async ({ id, action }) => {
      // Cancel any outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ['requests', 'all'] });

      // Snapshot the previous value
      const previousRequests = queryClient.getQueryData<RequestItem[]>(['requests', 'all']);

      // Optimistically update
      if (previousRequests) {
        const nextStatus = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'withdrawn';
        queryClient.setQueryData<RequestItem[]>(['requests', 'all'], (old) => {
          if (!old) return [];
          return old.map((item) =>
            item.request.id === id
              ? { ...item, request: { ...item.request, status: nextStatus } }
              : item
          );
        });
      }

      return { previousRequests };
    },
    onError: (_err, _variables, context) => {
      // Rollback to previous state on error
      if (context?.previousRequests) {
        queryClient.setQueryData(['requests', 'all'], context.previousRequests);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', 'all'] });
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="h-8 w-48 rounded bg-raised animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl border border-line bg-surface p-6 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-300 flex items-center gap-3">
        <AlertCircle size={20} />
        <p className="text-sm font-medium">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="border-b border-line pb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Collaboration</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Collaboration Requests</h1>
        <p className="mt-2 text-sm text-subtle">
          Review inbound and outbound teammate invitations and slot applications.
        </p>
      </div>

      {actMutation.isError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle size={15} />
          <span>{actMutation.error.message}</span>
        </div>
      )}

      <div className="space-y-4">
        {requests && requests.length > 0 ? (
          requests.map(({ request, from, team }) => {
            const isPending = request.status === 'pending';
            return (
              <div
                key={request.id}
                className="rounded-2xl border border-line bg-surface/80 p-6 backdrop-blur-sm transition-all hover:border-line-strong"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground">{from.fullName || from.username}</p>
                      <span className="font-mono text-xs text-muted">@{from.username}</span>
                    </div>
                    {team && (
                      <p className="mt-1 font-mono text-xs text-accent">
                        Target Team: {team.name}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                      request.status === 'accepted'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : request.status === 'rejected'
                        ? 'border-red-500/30 bg-red-500/10 text-red-400'
                        : request.status === 'withdrawn'
                        ? 'border-line bg-raised text-muted'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    <Clock size={11} />
                    {request.status}
                  </span>
                </div>

                {request.message && (
                  <p className="mt-4 rounded-xl border border-line/60 bg-raised/40 p-3.5 text-xs leading-relaxed text-subtle">
                    &ldquo;{request.message}&rdquo;
                  </p>
                )}

                {isPending && (
                  <div className="mt-5 flex flex-wrap gap-2.5 pt-2">
                    <button
                      onClick={() => actMutation.mutate({ id: request.id, action: 'accept' })}
                      disabled={actMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Check size={14} /> Accept
                    </button>
                    <button
                      onClick={() => actMutation.mutate({ id: request.id, action: 'reject' })}
                      disabled={actMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <X size={14} /> Reject
                    </button>
                    <button
                      onClick={() => actMutation.mutate({ id: request.id, action: 'withdraw' })}
                      disabled={actMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-raised/50 px-4 py-2 text-xs font-semibold text-subtle hover:bg-raised active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Undo2 size={14} /> Withdraw
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-surface/30 p-12 text-center text-subtle">
            <Inbox size={32} className="mx-auto text-muted mb-3 opacity-60" />
            <p className="text-sm font-medium">No requests in your inbox.</p>
            <p className="mt-1 text-xs text-muted">When builders send requests or when you apply to teams, they will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
