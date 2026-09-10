'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Shield, ArrowRight, AlertCircle } from 'lucide-react';

interface TeamItem {
  team: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    maxMembers: number;
  };
  membership: {
    role: string | null;
  };
}

export function TeamWorkspace() {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const { data: teams, isLoading, error } = useQuery<TeamItem[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await fetch('/api/teams', { credentials: 'include' });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error?.message ?? 'Could not load teams');
      }
      return body.data;
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string }) => {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: payload.name,
          description: payload.description,
          maxMembers: 4,
          rolesNeeded: [],
          isOpen: true,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error?.message ?? 'Failed to create team');
      }
      return body.data;
    },
    onSuccess: () => {
      setName('');
      setDescription('');
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || createTeamMutation.isPending) return;
    createTeamMutation.mutate({ name: name.trim(), description: description.trim() });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end border-b border-line pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-accent">Collaboration</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">My Teams</h1>
          <p className="mt-2 text-sm text-subtle">
            Manage your rosters, coordinate slots, and navigate workspaces.
          </p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-semibold text-black transition-all hover:opacity-90 active:scale-95"
        >
          <Plus size={15} />
          {showCreate ? 'Close' : 'Create Team'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-line bg-surface/90 p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 font-mono text-xs text-accent uppercase tracking-wider">
            <Users size={14} /> New Team Configuration
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-subtle mb-1">Team Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Neural Nexus"
                className="w-full rounded-xl border border-line bg-raised px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-subtle mb-1">Mission / Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are you building?"
                className="w-full rounded-xl border border-line bg-raised px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          {createTeamMutation.isError && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle size={14} />
              <span>{createTeamMutation.error.message}</span>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-xl border border-line bg-raised/50 px-4 py-2 text-xs font-medium text-foreground hover:bg-raised"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createTeamMutation.isPending}
              className="rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-black transition-all hover:opacity-90 disabled:opacity-50"
            >
              {createTeamMutation.isPending ? 'Saving…' : 'Save Team'}
            </button>
          </div>
        </form>
      )}

      {isLoading && (
        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl border border-line bg-surface p-6 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-300">
          <AlertCircle size={18} />
          <span className="text-sm">{error.message}</span>
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid gap-5 md:grid-cols-2">
          {teams && teams.length > 0 ? (
            teams.map(({ team, membership }) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="group flex flex-col justify-between rounded-2xl border border-line bg-surface/70 p-6 backdrop-blur-sm transition-all hover:border-accent/40 hover:bg-surface hover:shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-xl font-bold tracking-tight text-foreground group-hover:text-accent transition-colors">
                      {team.name}
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-wider rounded-full border border-line bg-raised px-2.5 py-1 text-subtle">
                      {team.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-subtle line-clamp-2">
                    {team.description || 'No description provided yet.'}
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-line/60 pt-4 font-mono text-xs text-muted">
                  <div className="flex items-center gap-2">
                    <Shield size={13} className="text-accent" />
                    <span>Role: {membership?.role || 'Member'}</span>
                    <span>·</span>
                    <span>Max {team.maxMembers}</span>
                  </div>
                  <ArrowRight size={14} className="text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-line bg-surface/30 p-12 text-center text-subtle">
              <Users size={32} className="mx-auto text-muted mb-3 opacity-60" />
              <p className="text-sm font-medium">You are not part of any teams yet.</p>
              <p className="mt-1 text-xs text-muted">Create a team above or accept an invitation to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
