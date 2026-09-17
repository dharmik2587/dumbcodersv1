import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  ChevronLeft,
  GraduationCap,
  HeartHandshake,
  Megaphone,
  Sparkles,
  Users,
} from 'lucide-react';
import { Panel, Reveal, Button } from '@/components/ui';
import { BetaBadge } from '@/components/shared/BetaBadge';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Campus Representatives · HackMate',
  description: 'Lead the hackathon builder community at your college or university.',
};

const PERKS = [
  {
    icon: Award,
    title: 'Verified Campus Lead Badge',
    description: 'Distinctive verified profile badge recognizing you as an official campus builder lead.',
  },
  {
    icon: Users,
    title: 'Direct Access to Core Maintainers',
    description: 'Weekly syncs with the HackMate engineering team to shape product features and sprint priorities.',
  },
  {
    icon: Sparkles,
    title: 'Exclusive Hacker Swag & Credits',
    description: 'Limited-edition HackMate stickers, t-shirts, and sponsor api credits for your campus hackathon squads.',
  },
  {
    icon: HeartHandshake,
    title: 'Letters of Recommendation',
    description: 'Strong technical and leadership recommendation letters from HackMate Labs founders for internships and jobs.',
  },
];

const RESPONSIBILITIES = [
  'Help students find complementary teammates for upcoming college hackathons.',
  'Organize informal campus squad formation workshops and roadmap brainstorming sessions.',
  'Channel real student feedback and bug reports directly to our development team.',
  'Distribute HackMate updates and open opportunities across student developer clubs.',
];

export default function CampusRepsPage() {
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
          <h1 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">
            Campus Representatives
          </h1>
          <BetaBadge />
        </div>

        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-fg2">
          HackMate is made on campus. Our Campus Rep program empowers student developers and community leaders to bring smarter hackathon team matchmaking to their universities.
        </p>

        <div className="mt-6">
          <Link href="/careers#apply">
            <Button size="lg" className="gap-2">
              Apply to represent your campus
              <ArrowRight size={15} />
            </Button>
          </Link>
        </div>
      </Reveal>

      {/* Perks */}
      <div className="mt-14">
        <h2 className="text-xl font-semibold text-fg">Program Perks & Benefits</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PERKS.map((p, idx) => {
            const Icon = p.icon;
            return (
              <Panel key={idx} className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                  <Icon size={18} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-fg">{p.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-fg2">{p.description}</p>
              </Panel>
            );
          })}
        </div>
      </div>

      {/* Responsibilities */}
      <div className="mt-14">
        <Panel className="p-6 md:p-8">
          <h2 className="text-xl font-semibold text-fg flex items-center gap-2">
            <Megaphone size={18} className="text-mint" />
            What Campus Reps Do
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {RESPONSIBILITIES.map((r, idx) => (
              <div key={idx} className="flex items-start gap-3 text-[13px] text-fg2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-[11px] font-bold text-fg">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{r}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Apply CTA */}
      <div className="mt-14 text-center">
        <Panel className="border-accent/30 bg-accent/5 p-8">
          <h3 className="text-xl font-bold text-fg">Ready to bring HackMate to your university?</h3>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-fg2">
            Fill out our student contributor application and select &quot;Campus Representative&quot;.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/careers#apply">
              <Button size="lg" className="gap-2">
                Submit Campus Rep Application
                <ArrowRight size={15} />
              </Button>
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
