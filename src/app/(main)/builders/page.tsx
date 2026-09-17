'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Clock,
  FilterX,
  GraduationCap,
  MapPin,
  Search,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import { useApiStore } from '@/client/store/apiStore';
import { ROLE_LABEL, ROLES, type RoleKey } from '@/client/types';
import { Avatar, roleTone } from '@/components/shared';
import { Panel, Reveal, Button, Chip } from '@/components/ui';
import { BetaBadge } from '@/components/shared/BetaBadge';
import { FeatureStatus } from '@/components/shared/FeatureStatus';

export default function BuildersPage() {
  const builders = useApiStore((s) => s.builders);
  const loadBuilders = useApiStore((s) => s.loadBuilders);

  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [openOnly, setOpenOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBuilders().finally(() => setLoading(false));
  }, [loadBuilders]);

  const filtered = useMemo(() => {
    return builders.filter((b) => {
      if (openOnly && !b.openToTeams) return false;
      if (selectedRole !== 'all' && b.role !== selectedRole) return false;

      const q = search.toLowerCase().trim();
      if (!q) return true;

      const matchName = b.name?.toLowerCase().includes(q);
      const matchHandle = b.handle?.toLowerCase().includes(q);
      const matchCollege = b.college?.toLowerCase().includes(q);
      const matchBio = b.bio?.toLowerCase().includes(q);
      const matchSkills = b.skills?.some((s) => s.label.toLowerCase().includes(q));

      return matchName || matchHandle || matchCollege || matchBio || matchSkills;
    });
  }, [builders, search, selectedRole, openOnly]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-16">
      {/* Header */}
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">Student Builders</h1>
              <BetaBadge />
            </div>
            <p className="mt-2 text-[14px] text-fg2">
              Discover active college developers, designers, and systems hackers looking for hackathon teammates.
            </p>
          </div>

          <Link href="/match">
            <Button variant="outline" className="gap-2">
              <Sparkles size={14} className="text-accent" />
              Smart match with your team
            </Button>
          </Link>
        </div>

        {/* Filters Bar */}
        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, college, skill (e.g. PyTorch, React, Rust)..."
              className="w-full rounded-xl border border-line bg-canvas py-2 pl-9 pr-4 text-[13px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="rounded-xl border border-line bg-canvas px-3 py-2 text-[13px] text-fg focus:border-accent focus:outline-none"
            >
              <option value="all">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setOpenOnly(!openOnly)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors ${
                openOnly
                  ? 'border-mint bg-mint/10 text-mint'
                  : 'border-line bg-canvas text-fg3 hover:text-fg'
              }`}
            >
              <UserCheck size={14} />
              Open to squads
            </button>
          </div>
        </div>
      </Reveal>

      {/* Builders Grid */}
      <div className="mt-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 rounded-2xl border border-line bg-surface animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Panel className="p-12 text-center">
            <FilterX size={32} className="mx-auto text-fg3" />
            <h3 className="mt-4 text-base font-semibold text-fg">No builders match your filter</h3>
            <p className="mt-1 text-[13px] text-fg3">
              Try searching for a different skill, college name, or reset the role filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearch('');
                setSelectedRole('all');
                setOpenOnly(false);
              }}
            >
              Clear filters
            </Button>
          </Panel>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((b) => (
              <Panel
                key={b.id}
                className="group flex flex-col justify-between p-5 transition-all hover:border-fg3 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar b={b} size={36} />
                      <div>
                        <Link
                          href={`/b/${b.id}`}
                          className="font-semibold text-fg group-hover:text-accent transition-colors"
                        >
                          {b.name}
                        </Link>
                        <p className="font-mono text-[11px] text-fg3">@{b.handle || 'builder'}</p>
                      </div>
                    </div>

                    <Chip tone={roleTone[b.role] || 'neutral'}>
                      {ROLE_LABEL[b.role] || b.role}
                    </Chip>
                  </div>

                  <div className="mt-4 space-y-1.5 text-[12px] text-fg3">
                    <div className="flex items-center gap-1.5 truncate">
                      <GraduationCap size={13} className="shrink-0 text-fg3" />
                      <span className="truncate">{b.college || 'Engineering College'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="shrink-0 text-fg3" />
                      <span>{b.weeklyHours || 15} hrs/wk commit window</span>
                    </div>
                  </div>

                  {b.bio && (
                    <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-fg2">
                      {b.bio}
                    </p>
                  )}

                  {b.skills && b.skills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {b.skills.slice(0, 4).map((s) => (
                        <span
                          key={s.id}
                          className="rounded-md border border-line bg-canvas/60 px-2 py-0.5 font-mono text-[10px] text-fg2"
                        >
                          {s.label}
                        </span>
                      ))}
                      {b.skills.length > 4 && (
                        <span className="rounded-md border border-line bg-canvas/60 px-1.5 py-0.5 font-mono text-[10px] text-fg3">
                          +{b.skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-line/60 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-mono ${
                      b.openToTeams ? 'text-mint' : 'text-fg3'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        b.openToTeams ? 'bg-mint' : 'bg-fg3'
                      }`}
                    />
                    {b.openToTeams ? 'Open to squads' : 'Squad locked'}
                  </span>

                  <Link
                    href={`/b/${b.id}`}
                    className="text-[12px] font-medium text-accent hover:underline"
                  >
                    View profile →
                  </Link>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>

      <div className="mt-14">
        <FeatureStatus
          featureKey="builders"
          status="BETA"
          title="Verified Student Builder Profiles"
          description="Builder profiles automatically sync GitHub public repositories and LeetCode contest ratings. Notice any inaccurate info? Let us know via Report a Problem."
        />
      </div>
    </div>
  );
}
