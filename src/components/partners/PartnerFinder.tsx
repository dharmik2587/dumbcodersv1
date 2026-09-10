'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { MessageSquare, Send, Sparkles, X, Loader2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type PartnerItem = {
  id: string;
  studentCode: string | null;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  skills: string[];
  rolePreference: string | null;
  compatibility: {
    score: number;
    reasons: string[];
    fillsGap?: boolean;
  };
};

const requestSchema = z.object({
  message: z.string().max(300, 'Message cannot exceed 300 characters'),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface PartnerFinderProps {
  initialTeamId?: string;
}

export function PartnerFinder({ initialTeamId }: PartnerFinderProps) {
  const searchParams = useSearchParams();
  const teamId = initialTeamId || searchParams.get('teamId') || undefined;
  const queryClient = useQueryClient();

  // Load saved query from sessionStorage
  const [query, setQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('partner_finder_query') || '';
    }
    return '';
  });

  // Persist query to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('partner_finder_query', query);
    }
  }, [query]);

  // Request Modal State
  const [selectedPartner, setSelectedPartner] = useState<PartnerItem | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: { message: '' },
  });

  const messageVal = watch('message') || '';

  const { data, isLoading, error } = useQuery({
    queryKey: ['partners', query, teamId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (teamId) params.set('teamId', teamId);

      const response = await fetch(`/api/users/search?${params.toString()}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Could not load partners');
      return body.data as {
        data: PartnerItem[];
        meta: { total: number };
      };
    },
  });

  const sendRequestMutation = useMutation({
    mutationFn: async ({ toUserId, message }: { toUserId: string; message: string }) => {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ toUserId, message, teamId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Could not send request');
      return body.data;
    },
    onSuccess: () => {
      toast.success('Collaboration request sent successfully');
      setSelectedPartner(null);
      reset();
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Could not send request');
    },
  });

  const onSubmitRequest = (formData: RequestFormData) => {
    if (!selectedPartner) return;
    sendRequestMutation.mutate({
      toUserId: selectedPartner.id,
      message: formData.message,
    });
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">Partner finder</p>
            {teamId && (
              <span className="rounded-full bg-accent/10 border border-accent-line px-2.5 py-0.5 text-xs font-semibold text-accent flex items-center gap-1">
                <Sparkles size={11} /> Team Matching Active
              </span>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">Find your missing teammate</h1>
          <p className="mt-2 text-sm text-fg2 max-w-2xl">
            Search by student code (e.g. HM-XXXXXX), name, or role. Candidates are scored and ranked by complementary skills and missing team roles.
          </p>
        </div>
        <div className="relative max-w-md w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg3" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by code (HM-...), name, skill, or role"
            className="w-full rounded-none border border-line bg-raised pl-9 pr-3.5 py-2.5 text-[14px] text-fg placeholder-fg3/50 outline-none transition-colors focus:border-accent-line focus:bg-surface"
          />
        </div>
      </div>

      {isLoading && (
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-line bg-surface p-6 flex flex-col justify-between h-64">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-raised" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 rounded bg-raised" />
                  <div className="h-3 w-20 rounded bg-raised" />
                </div>
              </div>
              <div className="space-y-2 my-4">
                <div className="h-3 w-full rounded bg-raised" />
                <div className="h-3 w-4/5 rounded bg-raised" />
              </div>
              <div className="h-9 w-full rounded bg-raised" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-10 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-400">
          {error.message}
        </div>
      )}

      {!isLoading && !error && data?.data.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-raised text-fg3">
            <Search size={20} />
          </div>
          <h3 className="text-base font-semibold text-fg">No matches found</h3>
          <p className="mt-1 text-sm text-fg2 max-w-sm mx-auto">
            Try broadening your search query or removing skill and role filters.
          </p>
          {query && (
            <button
              onClick={() => setQuery('')}
              className="mt-4 rounded border border-line bg-raised px-3 py-1.5 font-mono text-xs text-fg hover:border-accent"
            >
              Clear search query
            </button>
          )}
        </div>
      )}

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data?.data.map((partner) => {
          const fillsGap = partner.compatibility.fillsGap;
          return (
            <div
              key={partner.id}
              className="rounded-2xl border border-line bg-surface p-6 shadow-sm flex flex-col justify-between transition-all hover:border-accent-line hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {partner.avatarUrl ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-line">
                        <Image
                          src={partner.avatarUrl}
                          alt={partner.fullName ?? partner.username}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                          unoptimized={partner.avatarUrl.startsWith('http')}
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-accent-soft font-mono font-bold text-accent">
                        {(partner.fullName ?? partner.username).slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/b/${partner.username}`} className="font-bold text-fg hover:text-accent truncate">
                          {partner.fullName ?? partner.username}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-fg3 truncate">@{partner.username}</p>
                        {partner.studentCode && (
                          <span className="font-mono text-[10px] rounded bg-accent-soft border border-accent-line/40 px-1.5 py-0.2 font-semibold text-accent shrink-0">
                            {partner.studentCode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-mint/10 border border-mint/30 px-3 py-1 text-sm font-bold text-mint shrink-0">
                    {partner.compatibility.score}%
                  </span>
                </div>

                {/* Team gap badge */}
                {fillsGap && (
                  <div className="mt-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/40 bg-amber/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-amber">
                      <Sparkles size={11} /> Fills your missing {partner.rolePreference} role
                    </span>
                  </div>
                )}

                {partner.rolePreference && !fillsGap && (
                  <div className="mt-3">
                    <span className="font-mono text-[11px] rounded bg-raised px-2 py-0.5 text-fg2 font-medium border border-line">
                      Role: {partner.rolePreference}
                    </span>
                  </div>
                )}

                <p className="mt-4 line-clamp-2 text-sm leading-6 text-fg2">
                  {partner.bio ?? 'No bio yet.'}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {partner.skills.slice(0, 5).map((skill) => (
                    <span key={skill} className="rounded-full bg-raised border border-line px-2.5 py-0.5 text-xs text-fg2">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-line">
                <p className="text-xs text-fg3 mb-3 truncate">
                  {partner.compatibility.reasons.join(' · ') || 'Open to collaboration'}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPartner(partner)}
                    className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-accent-ink"
                  >
                    Send request
                  </button>
                  <Link
                    href={`/messages?user=${partner.id}`}
                    className="flex items-center justify-center rounded-xl border border-line bg-raised px-3 py-2.5 text-sm font-medium text-fg hover:border-accent-line transition"
                    title="Direct Message"
                  >
                    <MessageSquare size={16} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Request Modal */}
      <AnimatePresence>
        {selectedPartner && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setSelectedPartner(null)}
                className="absolute right-4 top-4 text-fg3 hover:text-fg"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <h2 className="text-lg font-bold text-fg">Request Collaboration</h2>
              <p className="mt-1 text-xs text-fg2">
                Send a structured request to <span className="text-accent font-semibold">{selectedPartner.fullName || selectedPartner.username}</span>.
              </p>

              <form onSubmit={handleSubmit(onSubmitRequest)} className="mt-5 space-y-4">
                <div>
                  <label className="font-mono text-[10.5px] uppercase tracking-wider text-fg2 block mb-1.5">
                    Message (optional)
                  </label>
                  <textarea
                    {...register('message')}
                    rows={4}
                    placeholder="Describe what you want to build together, your tech stack, or what role they would hold..."
                    className="w-full rounded-xl border border-line bg-raised p-3 text-sm text-fg placeholder:text-fg3 outline-none focus:border-accent resize-none"
                  />
                  <div className="mt-1.5 flex justify-between text-xs text-fg3">
                    <span>{errors.message?.message}</span>
                    <span className={messageVal.length > 280 ? 'text-amber' : ''}>
                      {messageVal.length}/300
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPartner(null)}
                    className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-fg hover:bg-raised"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendRequestMutation.isPending}
                    className="flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-black hover:bg-accent-ink disabled:opacity-50"
                  >
                    {sendRequestMutation.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={13} />
                    )}
                    <span>{sendRequestMutation.isPending ? 'Sending...' : 'Send Request'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
