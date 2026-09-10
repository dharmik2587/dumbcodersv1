'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bookmark, Heart, ExternalLink, Calendar, MapPin, Trophy, Sparkles, AlertCircle } from 'lucide-react';

type DetailResponse = {
  hackathon: {
    id: string;
    title: string;
    description: string | null;
    organizer: string | null;
    mode: string | null;
    location: string | null;
    registrationUrl: string | null;
    registrationDeadlineAt: string | null;
    startAt: string | null;
    endAt: string | null;
    themes: string[];
    techStack: string[];
    prizeDisplay: string | null;
  };
  bookmarked: boolean;
  interested: boolean;
};

export function HackathonDetail({ id }: { id: string }) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<DetailResponse>({
    queryKey: ['hackathon', id],
    queryFn: async () => {
      const response = await fetch(`/api/hackathons/${id}`, { credentials: 'include' });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error?.message ?? 'Could not load hackathon');
      }
      return body.data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ kind, active }: { kind: 'bookmark' | 'interest'; active: boolean }) => {
      const response = await fetch(`/api/hackathons/${id}/${kind}`, {
        method: active ? 'DELETE' : 'POST',
        credentials: 'include',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error?.message ?? 'Please sign in to save hackathons.');
      }
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackathon', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 animate-pulse">
        <div className="h-5 w-32 rounded bg-raised" />
        <div className="h-64 rounded-3xl border border-line bg-surface p-8 space-y-4">
          <div className="h-4 w-40 rounded bg-raised" />
          <div className="h-8 w-3/4 rounded bg-raised" />
          <div className="h-4 w-full rounded bg-raised" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-300 flex items-center gap-3">
        <AlertCircle size={20} />
        <p className="text-sm font-medium">{error?.message ?? 'Hackathon listing not found.'}</p>
      </div>
    );
  }

  const { hackathon, bookmarked, interested } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Link
        href="/hackathons"
        className="inline-flex items-center gap-1.5 font-mono text-xs text-subtle hover:text-accent transition-colors"
      >
        <ArrowLeft size={14} /> Back to all hackathons
      </Link>

      {/* Hero Banner */}
      <div className="rounded-3xl border border-line bg-surface/90 p-8 sm:p-10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-accent">
          <Sparkles size={13} />
          <span>{hackathon.organizer ?? 'Verified Host'}</span>
          <span>·</span>
          <span>{hackathon.mode ?? 'Open Format'}</span>
        </div>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {hackathon.title}
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-subtle max-w-3xl">
          {hackathon.description ?? 'No detailed description provided by organizer.'}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {hackathon.themes.map((theme) => (
            <span
              key={theme}
              className="rounded-lg border border-line bg-raised/70 px-2.5 py-1 font-mono text-[11px] text-foreground"
            >
              {theme}
            </span>
          ))}
        </div>
      </div>

      {toggleMutation.isError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle size={15} />
          <span>{toggleMutation.error.message}</span>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-line bg-surface/80 p-6 space-y-6 backdrop-blur-sm">
          <h2 className="font-mono text-xs uppercase tracking-wider text-accent">Schedule & Logistics</h2>
          <dl className="space-y-4 text-xs font-mono">
            <div>
              <dt className="text-muted uppercase tracking-wider">Start / End</dt>
              <dd className="mt-1 text-foreground">
                {hackathon.startAt ? new Date(hackathon.startAt).toLocaleString() : 'TBA'}
                {hackathon.endAt ? ` → ${new Date(hackathon.endAt).toLocaleString()}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-muted uppercase tracking-wider">Registration Deadline</dt>
              <dd className="mt-1 text-foreground">
                {hackathon.registrationDeadlineAt
                  ? new Date(hackathon.registrationDeadlineAt).toLocaleString()
                  : 'Open indefinitely'}
              </dd>
            </div>
            <div>
              <dt className="text-muted uppercase tracking-wider">Format & Location</dt>
              <dd className="mt-1 text-foreground">{hackathon.location ?? 'Online / Distributed'}</dd>
            </div>
            <div>
              <dt className="text-muted uppercase tracking-wider">Prizes & Bounties</dt>
              <dd className="mt-1 text-foreground">{hackathon.prizeDisplay ?? 'Check registration page'}</dd>
            </div>
          </dl>

          {hackathon.techStack.length > 0 && (
            <div className="border-t border-line/60 pt-6">
              <h3 className="font-mono text-xs uppercase tracking-wider text-accent mb-3">Tech Ecosystem</h3>
              <div className="flex flex-wrap gap-1.5">
                {hackathon.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-md border border-line bg-raised px-2.5 py-1 font-mono text-[10px] text-foreground"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="rounded-2xl border border-line bg-surface/80 p-6 space-y-4 backdrop-blur-sm h-fit">
          <p className="font-mono text-xs uppercase tracking-wider text-accent">Participation</p>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => toggleMutation.mutate({ kind: 'bookmark', active: bookmarked })}
              disabled={toggleMutation.isPending}
              className={`w-full flex items-center justify-center gap-2 rounded-xl border p-3 font-mono text-xs font-semibold transition-all ${
                bookmarked
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-line bg-raised/50 text-foreground hover:bg-raised'
              }`}
            >
              <Bookmark size={14} />
              <span>{bookmarked ? 'Bookmarked' : 'Bookmark Event'}</span>
            </button>

            <button
              type="button"
              onClick={() => toggleMutation.mutate({ kind: 'interest', active: interested })}
              disabled={toggleMutation.isPending}
              className={`w-full flex items-center justify-center gap-2 rounded-xl border p-3 font-mono text-xs font-semibold transition-all ${
                interested
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                  : 'border-line bg-raised/50 text-foreground hover:bg-raised'
              }`}
            >
              <Heart size={14} />
              <span>{interested ? 'Interested' : 'Mark as Interested'}</span>
            </button>
          </div>

          <div className="border-t border-line/60 pt-4 space-y-2.5">
            {hackathon.registrationUrl ? (
              <a
                href={hackathon.registrationUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-accent p-3 text-xs font-semibold text-black transition-all hover:opacity-90 active:scale-95"
              >
                <span>Register on Portal</span>
                <ExternalLink size={13} />
              </a>
            ) : (
              <p className="font-mono text-[11px] text-muted text-center">Registration link pending.</p>
            )}

            <Link
              href={`/find-partners?hackathonId=${hackathon.id}`}
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-line bg-raised/60 p-3 font-mono text-xs text-foreground transition-all hover:border-accent hover:text-accent"
            >
              <Sparkles size={13} />
              <span>Find Partners</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
