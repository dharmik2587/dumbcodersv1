import React from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Bug, CheckCircle2, ChevronLeft, Sparkles } from 'lucide-react';
import { Panel, Reveal, Button, Chip } from '@/components/ui';
import { BetaBadge } from '@/components/shared/BetaBadge';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog · HackMate Beta',
  description: 'Track ongoing releases, fixes, and the student engineering roadmap for HackMate.',
};

const RELEASES = [
  {
    version: 'v0.9.0-beta',
    date: 'September 2026',
    tag: 'Current Beta',
    headline: 'Beta Productization & Public First Architecture',
    description:
      'Transitioned HackMate from internal prototype to a public student-built beta platform. No forced sign-in walls, live Neon PostgreSQL data, and direct contributor pipelines.',
    changes: [
      {
        type: 'feature',
        text: 'Public Builder Directory & Profiles without sign-in barriers.',
      },
      {
        type: 'feature',
        text: 'Live Hackathon Ingestion connecting directly to verified external sources (Unstop, Devfolio).',
      },
      {
        type: 'feature',
        text: 'First-Class "Report a Problem" pipeline with category tagging and student maintainer triage.',
      },
      {
        type: 'feature',
        text: '"Help Us Build" Student Contributor Program with open roles across frontend, backend, and campus reps.',
      },
      {
        type: 'feature',
        text: 'Global Feature Status System making unfinished or experimental features transparent to users.',
      },
      {
        type: 'improvement',
        text: 'Interactive Guest Auth Modals when unauthenticated users attempt write actions.',
      },
    ],
  },
  {
    version: 'v0.8.4',
    date: 'August 2026',
    tag: 'Milestone',
    headline: 'Transactional Outbox & Team Messaging',
    description:
      'Reliable webhook and notification distribution with cryptographic payload hashing.',
    changes: [
      {
        type: 'feature',
        text: 'PostgreSQL transactional outbox for reliable background job processing.',
      },
      {
        type: 'security',
        text: 'AES-GCM encryption for team direct messages.',
      },
      {
        type: 'improvement',
        text: 'Sliding-window Redis and memory fallback rate limiting on mutations.',
      },
    ],
  },
];

const UPCOMING = [
  'Multi-track AI team recommendation heuristic',
  'Automated n8n crawler triggers for campus hackathons',
  'Real-time encrypted Pusher sync for team chat',
  'Autonomous AI agent for project roadmap milestone generation',
  'Verified college email domain matching for campus squads',
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:py-20">
      <Reveal>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-fg3 transition-colors hover:text-fg"
        >
          <ChevronLeft size={16} />
          Back to HackMate
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">Beta Changelog</h1>
          <BetaBadge />
        </div>

        <p className="mt-4 text-[15px] leading-relaxed text-fg2">
          HackMate is built in public by college students. We deploy frequently and document both new features and known work-in-progress areas honestly.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link href="/report-problem">
            <Button variant="outline" size="sm" className="gap-2">
              <Bug size={14} className="text-amber" />
              Report a bug in this release
            </Button>
          </Link>
          <Link href="/careers">
            <Button size="sm" className="gap-2">
              <Sparkles size={14} />
              Help build next release
            </Button>
          </Link>
        </div>
      </Reveal>

      {/* Changelog Timeline */}
      <div className="mt-14 space-y-12">
        {RELEASES.map((release) => (
          <Reveal key={release.version}>
            <div className="relative pl-6 border-l-2 border-line sm:pl-8">
              <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-accent bg-canvas" />

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-sm font-semibold text-fg">{release.version}</span>
                <span className="rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-[10px] text-fg3">
                  {release.date}
                </span>
                <Chip tone="mint">
                  {release.tag}
                </Chip>
              </div>

              <h2 className="mt-3 text-xl font-bold text-fg">{release.headline}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-fg2">{release.description}</p>

              <div className="mt-5 space-y-2.5">
                {release.changes.map((c, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[13px] text-fg2">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-mint" />
                    <span>{c.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        ))}

        {/* Coming Next */}
        <Reveal>
          <div className="relative pl-6 border-l-2 border-dashed border-line sm:pl-8">
            <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-fg3 bg-canvas" />

            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-semibold text-fg">Coming Next</span>
              <Chip tone="neutral">
                In Development
              </Chip>
            </div>

            <p className="mt-2 text-[14px] text-fg2">
              Features currently on our student maintainers sprint board:
            </p>

            <ul className="mt-4 space-y-2 text-[13px] text-fg2">
              {UPCOMING.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
