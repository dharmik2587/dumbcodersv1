'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronLeft,
  Code2,
  Cpu,
  Layers,
  Network,
  Sparkles,
  Users,
} from 'lucide-react';
import { Panel, Reveal, Button, Chip } from '@/components/ui';
import { BetaBadge } from '@/components/shared/BetaBadge';
import { FeatureStatus } from '@/components/shared/FeatureStatus';
import { CLUSTERS, CLUSTER_NAME, CLUSTER_ORDER } from '@/client/data/seed';
import { useApiStore } from '@/client/store/apiStore';
import { ROLE_LABEL } from '@/client/types';
import { roleTone } from '@/components/shared';

const CLUSTER_ICONS: Record<string, any> = {
  interface: Layers,
  services: Cpu,
  infra: Network,
  intelligence: Brain,
  craft: Sparkles,
  narrative: Code2,
  mobile: Network,
};

export default function SkillsPage() {
  const builders = useApiStore((s) => s.builders);
  const loadBuilders = useApiStore((s) => s.loadBuilders);
  const [activeCluster, setActiveCluster] = useState<string>('interface');

  useEffect(() => {
    if (builders.length === 0) {
      loadBuilders();
    }
  }, [builders.length, loadBuilders]);

  const activeSkills = useMemo(() => {
    return CLUSTERS.filter((c) => c.cluster === activeCluster);
  }, [activeCluster]);

  const matchingBuilders = useMemo(() => {
    return builders.filter((b) => {
      return b.skills?.some((s) => s.cluster === activeCluster);
    });
  }, [builders, activeCluster]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-16">
      {/* Header */}
      <Reveal>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-fg3 transition-colors hover:text-fg"
        >
          <ChevronLeft size={16} />
          Back to HackMate
        </Link>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 text-accent">
                <Network size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">Skill Graph</h1>
                  <BetaBadge />
                </div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-fg3">
                  Interactive Builder Capability Taxonomy
                </p>
              </div>
            </div>
          </div>

          <Link href="/match">
            <Button className="gap-2">
              <Sparkles size={14} />
              Compute team skill gaps
            </Button>
          </Link>
        </div>

        <div className="mt-6">
          <FeatureStatus
            status="BETA"
            title="Skill Graph · Beta"
            description="We're experimenting with a better way to represent how builders connect through skills instead of static résumés. Track how skills overlap across hackathon tracks."
          />
        </div>
      </Reveal>

      {/* Cluster Navigation */}
      <div className="mt-10">
        <h2 className="text-sm font-mono uppercase tracking-wider text-fg3">
          Select Capability Cluster
        </h2>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {CLUSTER_ORDER.map((clusterKey) => {
            const Icon = CLUSTER_ICONS[clusterKey] || Layers;
            const isSelected = activeCluster === clusterKey;
            const skillCount = CLUSTERS.filter((c) => c.cluster === clusterKey).length;

            return (
              <button
                key={clusterKey}
                type="button"
                onClick={() => setActiveCluster(clusterKey)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-3.5 text-center transition-all ${
                  isSelected
                    ? 'border-accent bg-accent/15 text-fg shadow-sm'
                    : 'border-line bg-surface/60 text-fg2 hover:border-fg3 hover:bg-surface'
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                    isSelected
                      ? 'border-accent/50 bg-accent text-accent-fg'
                      : 'border-line bg-canvas text-fg3'
                  }`}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <span className="block text-[13px] font-medium leading-tight">
                    {CLUSTER_NAME[clusterKey] || clusterKey}
                  </span>
                  <span className="font-mono text-[10px] text-fg3">
                    {skillCount} skills
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cluster Content & Skills */}
      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Skills in Cluster */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-base font-semibold text-fg flex items-center gap-2">
            <span>Skills in {CLUSTER_NAME[activeCluster] || activeCluster}</span>
          </h3>

          <div className="space-y-2.5">
            {activeSkills.map((sk) => (
              <Panel key={sk.label} className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-[14px] font-medium text-fg">{sk.label}</h4>
                  <p className="mt-0.5 font-mono text-[11px] text-fg3">
                    Primary role: {ROLE_LABEL[sk.role] || sk.role}
                  </p>
                </div>
                <Chip tone={roleTone[sk.role] || 'neutral'}>
                  {sk.role}
                </Chip>
              </Panel>
            ))}
          </div>
        </div>

        {/* Right Column: Builders with Skills in this Cluster */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-fg">
              Builders with {CLUSTER_NAME[activeCluster]} Skills ({matchingBuilders.length})
            </h3>
            <Link
              href={`/builders?role=${activeSkills[0]?.role || 'all'}`}
              className="text-[12px] font-medium text-accent hover:underline"
            >
              Browse all builders →
            </Link>
          </div>

          {matchingBuilders.length === 0 ? (
            <Panel className="p-8 text-center text-fg3">
              <Users size={24} className="mx-auto mb-2 text-fg3" />
              <p className="text-[13px]">
                No student builders currently listed for this specific cluster in the sample seed.
              </p>
            </Panel>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {matchingBuilders.slice(0, 6).map((b) => (
                <Panel key={b.id} className="p-4 flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/b/${b.id}`}
                      className="text-[14px] font-semibold text-fg hover:text-accent transition-colors"
                    >
                      {b.name}
                    </Link>
                    <p className="font-mono text-[11px] text-fg3 truncate max-w-[180px]">
                      {b.college || 'Engineering College'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {b.skills
                        ?.filter((s) => s.cluster === activeCluster)
                        .map((s) => (
                          <span
                            key={s.id}
                            className="rounded border border-line bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-fg2"
                          >
                            {s.label}
                          </span>
                        ))}
                    </div>
                  </div>

                  <Link
                    href={`/b/${b.id}`}
                    className="shrink-0 text-[12px] font-medium text-accent hover:underline"
                  >
                    View →
                  </Link>
                </Panel>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
