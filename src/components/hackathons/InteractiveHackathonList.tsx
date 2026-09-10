'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Calendar, Users, Trophy, Sparkles, MapPin, Search, RefreshCw } from 'lucide-react';
import type { Hackathon } from '@/lib/db/schema/core';

interface InteractiveHackathonListProps {
  initialHackathons: Hackathon[];
}

export function InteractiveHackathonList({ initialHackathons }: InteractiveHackathonListProps) {
  const [hackathons, setHackathons] = useState<Hackathon[]>(initialHackathons);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'Online' | 'In-Person'>('ALL');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const filtered = hackathons.filter((h) => {
    if (h.status === 'closed') return false;

    const matchesSearch =
      search.trim() === '' ||
      h.title.toLowerCase().includes(search.toLowerCase()) ||
      (h.organizer && h.organizer.toLowerCase().includes(search.toLowerCase())) ||
      h.themes.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesMode =
      modeFilter === 'ALL' ||
      (modeFilter === 'Online' && h.mode?.toLowerCase() === 'online') ||
      (modeFilter === 'In-Person' && h.mode?.toLowerCase() !== 'online');

    return matchesSearch && matchesMode;
  });

  const handleRefresh = async () => {
    setSyncing(true);
    setSyncMsg('Fetching live hackathons…');
    try {
      const res = await fetch('/api/hackathons?pageSize=50', { credentials: 'include' });
      const data = await res.json();
      const rows = data.data?.data || data.data?.rows;
      if (rows) {
        setHackathons(rows);
        setSyncMsg(`Refreshed ${rows.length} hackathons.`);
      }
    } catch {
      setSyncMsg('Failed to refresh hackathons.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls & Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, theme, college..."
            className="w-full rounded-xl border border-line bg-raised py-2 pl-9 pr-4 text-xs font-medium text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-line bg-raised/70 p-1">
            {(['ALL', 'Online', 'In-Person'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setModeFilter(mode)}
                className={`rounded-lg px-3 py-1 font-mono text-[11px] font-semibold transition-all ${
                  modeFilter === mode
                    ? 'bg-accent text-black shadow-xs'
                    : 'text-subtle hover:text-foreground'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-raised/60 px-3.5 py-2 text-xs font-medium text-foreground transition-all hover:bg-raised active:scale-95 disabled:opacity-50"
            title="Refresh Hackathons"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin text-accent' : 'text-muted'}`} />
            <span>{syncing ? 'Syncing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className="rounded-xl border border-accent/20 bg-accent/10 px-4 py-2 font-mono text-xs text-accent">
          {syncMsg}
        </div>
      )}

      {/* Hackathons Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface/30 p-12 text-center text-subtle">
          <p className="text-sm font-medium">No hackathons match your search criteria.</p>
          <p className="mt-1 text-xs text-muted">Try adjusting your filters or click Refresh.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((hackathon) => {
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
                  {/* Tags / Badges */}
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

                  {/* Title & Organizer */}
                  <h3 className="mt-4 line-clamp-2 text-lg font-bold tracking-tight text-foreground group-hover:text-accent transition-colors">
                    {hackathon.title}
                  </h3>
                  <p className="mt-1 line-clamp-1 font-mono text-xs text-muted">
                    by {hackathon.organizer || 'Verified Organizer'}
                  </p>

                  {/* Description preview */}
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-subtle">
                    {hackathon.description || 'No description provided.'}
                  </p>

                  {/* Themes / Tags */}
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

                {/* Footer / Actions */}
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
      )}
    </div>
  );
}
