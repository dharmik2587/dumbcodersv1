'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Code2,
  Database,
  ExternalLink,
  GraduationCap,
  Layers,
  Layout,
  Loader2,
  Send,
  Sparkles,
  Users2,
} from 'lucide-react';
import { Panel, Reveal, Button } from '@/components/ui';
import { BetaBadge } from '@/components/shared/BetaBadge';
import { CAREER_ROLES, careerRoleLabels, type CareerRole } from '@/lib/validations/career';
import { useAuth } from '@/providers/AuthProvider';

const OPPORTUNITIES = [
  {
    id: 'frontend',
    role: 'Frontend Engineer',
    category: 'Engineering',
    commitment: 'Student Contributor · 4-8 hrs/wk',
    description:
      'Improve our Next.js 15 App Router experience, craft fluid micro-animations with Framer Motion, and build responsive interfaces for hackathon team composition.',
    skills: ['React 19', 'Next.js 15', 'Tailwind', 'TypeScript'],
    icon: Layout,
  },
  {
    id: 'backend',
    role: 'Backend / Systems Engineer',
    category: 'Engineering',
    commitment: 'Student Contributor · 4-8 hrs/wk',
    description:
      'Design reliable APIs, optimize Drizzle ORM queries on Neon PostgreSQL, and maintain outbox workers and transactional rate limiters.',
    skills: ['Neon PostgreSQL', 'Drizzle ORM', 'Node.js', 'Redis'],
    icon: Database,
  },
  {
    id: 'data_scraping',
    role: 'Data & Ingestion Engineer',
    category: 'Data',
    commitment: 'Student Contributor · 3-6 hrs/wk',
    description:
      'Scale automated crawler pipelines that extract, validate, and deduplicate hackathon schedules from Unstop, Devfolio, and campus event boards.',
    skills: ['Python', 'Cheerio', 'Data Pipelines', 'Validation'],
    icon: Code2,
  },
  {
    id: 'ai_ml',
    role: 'AI / ML Contributor',
    category: 'Intelligence',
    commitment: 'Student Contributor · 4-8 hrs/wk',
    description:
      'Develop smart teammate recommendation heuristics, skill complementarity models, and LLM-driven project roadmap generation.',
    skills: ['OpenAI API', 'Vector Embeddings', 'Recommendation Systems'],
    icon: Sparkles,
  },
  {
    id: 'design',
    role: 'UI / UX Designer',
    category: 'Design',
    commitment: 'Student Contributor · 3-5 hrs/wk',
    description:
      'Refine our dark-mode design system, user journeys for guest onboarding, and visual representations for the builders skill graph.',
    skills: ['Figma', 'Design Systems', 'UX Research', 'Information Design'],
    icon: Layers,
  },
  {
    id: 'campus_rep',
    role: 'Campus Representative',
    category: 'Community',
    commitment: 'Campus Ambassador · Flexible',
    description:
      'Represent HackMate at your university hackathons, help fellow students find squads, and channel direct student feedback to the core team.',
    skills: ['Community Leadership', 'Hackathons', 'Student Outreach'],
    icon: GraduationCap,
  },
];

export default function CareersPage() {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string>('frontend');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (message.trim().length < 15) {
      setErrorMsg('Please tell us a bit more about why you are interested (minimum 15 characters).');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          role: selectedRole,
          githubUrl: githubUrl.trim() || undefined,
          portfolioUrl: portfolioUrl.trim() || undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || 'Failed to submit application.');
      }

      setSubmittedId(data.data?.id || 'RECEIVED');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Something went wrong while submitting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:py-20">
      {/* Header */}
      <Reveal>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-fg3 transition-colors hover:text-fg"
        >
          <ChevronLeft size={16} />
          Back to HackMate
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">Help Us Build HackMate</h1>
          <BetaBadge />
        </div>

        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-fg2">
          HackMate is being built by students who care about making hackathons less lonely and more productive.
          We build in public between classes and late nights. Whether you want to fix a bug, build a backend endpoint, or lead your campus hackathon community, we would love to have you.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-medium text-fg transition-colors hover:border-fg3 hover:bg-surface-2"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            View GitHub Repository
            <ExternalLink size={13} className="text-fg3" />
          </a>
          <a
            href="#apply"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-[13px] font-medium text-accent-fg transition-opacity hover:opacity-95"
          >
            Apply as student contributor
            <ArrowRight size={14} />
          </a>
        </div>
      </Reveal>

      {/* Roles Grid */}
      <div className="mt-14">
        <h2 className="text-xl font-semibold text-fg">Open Contributor Roles</h2>
        <p className="mt-1 text-[13px] text-fg3">
          Flexible, student-friendly commitments with verified public attribution.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {OPPORTUNITIES.map((opp) => {
            const Icon = opp.icon;
            const isSelected = selectedRole === opp.id;
            return (
              <Panel
                key={opp.id}
                className={`flex flex-col justify-between p-6 transition-all ${
                  isSelected ? 'border-accent bg-accent/5' : 'hover:border-fg3'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-2 text-fg">
                      <Icon size={18} />
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-fg3">
                      {opp.category}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-fg">{opp.role}</h3>
                  <p className="mt-1 font-mono text-[11px] text-mint">{opp.commitment}</p>
                  <p className="mt-3 text-[13px] leading-relaxed text-fg2">{opp.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-line/60">
                  <div className="flex flex-wrap gap-1.5">
                    {opp.skills.map((s) => (
                      <span
                        key={s}
                        className="rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-[10px] text-fg3"
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole(opp.id);
                      const el = document.getElementById('apply');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:underline"
                  >
                    Select this role →
                  </button>
                </div>
              </Panel>
            );
          })}
        </div>
      </div>

      {/* Application Form */}
      <div id="apply" className="mt-16 scroll-mt-10">
        <h2 className="text-xl font-semibold text-fg">Join the Student Contributor Team</h2>
        <p className="mt-1 text-[13px] text-fg3">
          No formal corporate résumé required. Tell us what you build and what excites you.
        </p>

        {submittedId ? (
          <Panel className="mt-6 border-mint/40 bg-mint/5 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-mint/20 text-mint">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-fg">Application Received!</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-fg2">
              Thank you for wanting to help build HackMate. A student maintainer will check out your links and reach out to schedule an informal welcome chat!
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSubmittedId(null);
                  setMessage('');
                }}
              >
                Submit another application
              </Button>
              <Link href="/">
                <Button size="sm">Back to homepage</Button>
              </Link>
            </div>
          </Panel>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6">
            <Panel className="space-y-5 p-6 md:p-8">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-[13px] font-medium text-fg">
                    Your name <span className="text-amber">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Sharma"
                    className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2 text-[13px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-fg">
                    Your email <span className="text-amber">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@college.edu"
                    className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2 text-[13px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-fg">
                  Role you&apos;d like to contribute to <span className="text-amber">*</span>
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-[13px] text-fg focus:border-accent focus:outline-none"
                >
                  {CAREER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {careerRoleLabels[role]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div>
                  <label className="block text-[13px] font-medium text-fg">GitHub Profile</label>
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="github.com/username"
                    className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2 text-[13px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-fg">Portfolio / Projects</label>
                  <input
                    type="text"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://yourportfolio.dev"
                    className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2 text-[13px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-fg">LinkedIn (optional)</label>
                  <input
                    type="text"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="linkedin.com/in/username"
                    className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2 text-[13px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-fg">
                  Tell us what you build and why you want to help <span className="text-amber">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What projects have you worked on? What part of HackMate do you want to build or improve?"
                  className="mt-1.5 w-full rounded-xl border border-line bg-canvas p-3 text-[13px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none"
                />
              </div>

              {errorMsg && (
                <p className="text-[13px] text-red-400">{errorMsg}</p>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full justify-center gap-2"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting application...
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    Submit contributor application
                  </>
                )}
              </Button>
            </Panel>
          </form>
        )}
      </div>
    </div>
  );
}
