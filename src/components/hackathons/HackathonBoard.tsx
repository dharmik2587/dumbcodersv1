'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Trophy, Calendar, Users, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface HackathonItem {
  id: string;
  title: string;
  description: string | null;
  organizer: string | null;
  mode: string | null;
  themes: string[];
  registrationDeadlineAt: string | null;
  prizeDisplay: string | null;
  prizeAmount: string | null;
  registrationUrl: string | null;
  sourceUrl: string | null;
  teamSizeMin: number | null;
  teamSizeMax: number | null;
}

interface HackathonResponse {
  data: HackathonItem[];
  meta: { total: number };
}

async function fetchHackathons(q: string, mode: string): Promise<HackathonResponse> {
  const params = new URLSearchParams({ pageSize: '50' });
  if (q) params.set('q', q);
  if (mode && mode !== 'ALL') params.set('mode', mode);

  const response = await fetch(`/api/hackathons?${params.toString()}`, {
    credentials: 'include',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error?.message ?? 'Could not load hackathons');
  }
  return body.data;
}

export function HackathonBoard() {
  const [query, setQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'Online' | 'In-Person'>('ALL');

  const { data, isLoading, error } = useQuery<HackathonResponse>({
    queryKey: ['hackathons', query, modeFilter],
    queryFn: () => fetchHackathons(query, modeFilter),
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-line pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-accent">
            <Sparkles className="h-3 w-3" />
            <span>Verified Hackathon Registry</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Explore Hackathons
          </h1>
          <p className="mt-2 text-sm text-subtle">
            Browse verified hackathons, direct-apply, or assemble complementary rosters.
          </p>
        </div>

        {/* Search & Mode Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search hackathons…"
              className="w-64 rounded-xl border border-line bg-raised py-2 pl-9 pr-4 text-xs font-medium text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex rounded-xl border border-line bg-raised/70 p-1">
            {(['ALL', 'Online', 'In-Person'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setModeFilter(mode)}
                className={`rounded-lg px-3 py-1 font-mono text-[11px] font-semibold transition-all ${
                  modeFilter === mode
                    ? 'bg-accent text-black shadow-sm'
                    : 'text-subtle hover:text-foreground'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-line bg-surface/80 p-6 backdrop-blur-sm space-y-4 animate-pulse"
            >
              <div className="flex justify-between">
                <div className="h-5 w-20 rounded bg-raised" />
                <div className="h-5 w-24 rounded bg-raised" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-3/4 rounded bg-raised" />
                <div className="h-3 w-1/2 rounded bg-raised" />
              </div>
              <div className="space-y-1.5 pt-2">
                <div className="h-3 w-full rounded bg-raised" />
                <div className="h-3 w-4/5 rounded bg-raised" />
              </div>
              <div className="flex gap-2 pt-2">
                <div className="h-5 w-14 rounded bg-raised" />
                <div className="h-5 w-14 rounded bg-raised" />
              </div>
              <div className="pt-4 border-t border-line/60 flex justify-between">
                <div className="h-8 w-full rounded bg-raised" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-300">
          <AlertCircle size={20} />
          <span className="text-sm">{error.message}</span>
        </div>
      )}

      {!isLoading && !error && data?.data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line bg-surface/30 p-12 text-center text-subtle">
          <p className="text-sm font-medium">No hackathons match your search criteria.</p>
          <p className="mt-1 text-xs text-muted">Try clearing your filters or searching with different keywords.</p>
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data?.data.map((hackathon) => {
          const isOnline = hackathon.mode?.toLowerCase() === 'online';
          const deadline = hackathon.registrationDeadlineAt
            ? new Date(hackathon.registrationDeadlineAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : null;

          return (
            <div
              key={hackathon.id}
              className="group flex flex-col justify-between rounded-2xl border border-line bg-surface/80 p-6 backdrop-blur-sm transition-all hover:border-accent/40 hover:bg-surface hover:shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                      isOnline
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                    }`}
                  >
                    <MapPin className="h-3 w-3" />
                    {hackathon.mode || 'Online'}
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-amber-300">
                    <Trophy className="h-3 w-3 text-amber-400" />
                    {hackathon.prizeDisplay || (hackathon.prizeAmount ? `₹${hackathon.prizeAmount}` : 'Cash & Swags')}
                  </span>
                </div>

                <h3 className="mt-4 line-clamp-2 text-lg font-bold tracking-tight text-foreground group-hover:text-accent transition-colors">
                  {hackathon.title}
                </h3>
                <p className="mt-1 line-clamp-1 font-mono text-xs text-muted">
                  by {hackathon.organizer || 'Verified Organizer'}
                </p>

                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-subtle">
                  {hackathon.description || 'No description provided.'}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {hackathon.themes.slice(0, 3).map((theme) => (
                    <span
                      key={theme}
                      className="rounded-md border border-line bg-raised/70 px-2 py-0.5 font-mono text-[10px] text-subtle"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 border-t border-line/60 pt-4">
                <div className="mb-3 flex items-center justify-between font-mono text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted" />
                    {deadline ? `Deadline: ${deadline}` : 'Open now'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-muted" />
                    {hackathon.teamSizeMin || 1}-{hackathon.teamSizeMax || 4} members
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={hackathon.registrationUrl || hackathon.sourceUrl || 'https://unstop.com/hackathons'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent py-2 text-xs font-semibold text-black transition-all hover:opacity-90 active:scale-95"
                  >
                    <span>View Hackathon</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  <Link
                    href={`/find-partners?hackathonId=${hackathon.id}`}
                    className="rounded-xl border border-line bg-raised/60 p-2 text-subtle transition-all hover:border-accent hover:text-accent active:scale-95"
                    title="Find Teammates"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
