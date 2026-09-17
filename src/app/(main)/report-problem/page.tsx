'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Bug, CheckCircle2, ChevronLeft, Loader2, Send } from 'lucide-react';
import { Panel, Reveal, Button } from '@/components/ui';
import { FeatureStatus } from '@/components/shared/FeatureStatus';
import { REPORT_CATEGORIES, reportCategoryLabels, type ReportCategory } from '@/lib/validations/report';
import { useAuth } from '@/providers/AuthProvider';

export default function ReportProblemPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [category, setCategory] = useState<ReportCategory>('broken_feature');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  // Auto-detect page URL from query param or window location
  useEffect(() => {
    const fromParam = searchParams.get('page') || searchParams.get('from');
    if (fromParam) {
      setPageUrl(fromParam);
    } else if (typeof window !== 'undefined') {
      const referrer = document.referrer;
      setPageUrl(referrer || window.location.href);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (description.trim().length < 10) {
      setErrorMsg('Please describe the problem in a bit more detail (minimum 10 characters).');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          description,
          email: email.trim() || undefined,
          pageUrl: pageUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || 'Failed to submit problem report.');
      }

      setSubmittedId(data.data?.id || 'SUBMITTED');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Something went wrong while submitting your report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:py-20">
      <Reveal>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-fg3 transition-colors hover:text-fg"
        >
          <ChevronLeft size={16} />
          Back to HackMate
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber/40 bg-amber/10 text-amber">
            <Bug size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl">Report a Problem</h1>
            <p className="font-mono text-[11px] uppercase tracking-wider text-fg3">
              Direct to Student Maintainers · Triage Pipeline
            </p>
          </div>
        </div>

        <p className="mt-4 text-[14px] leading-relaxed text-fg2">
          Found a bug, incorrect hackathon dates, broken button, or unexpected layout? We appreciate you taking the time to report it.
          Guest and authenticated reports are directly reviewed by the student core team.
        </p>
      </Reveal>

      {submittedId ? (
        <Reveal delay={40}>
          <Panel className="mt-8 border-mint/40 bg-mint/5 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-mint/20 text-mint">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-fg">Report Received!</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-fg2">
              Thank you for helping make HackMate better. Your report reference ID is:
            </p>
            <div className="mx-auto mt-3 inline-block rounded-lg border border-line bg-surface px-3 py-1 font-mono text-xs text-fg">
              {submittedId}
            </div>
            <p className="mt-4 text-[12px] text-fg3">
              If you provided an email, we will follow up once the fix is deployed to staging.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSubmittedId(null);
                  setDescription('');
                }}
              >
                Submit another report
              </Button>
              <Link href="/">
                <Button size="sm">Back to homepage</Button>
              </Link>
            </div>
          </Panel>
        </Reveal>
      ) : (
        <Reveal delay={40}>
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <Panel className="space-y-5 p-6 md:p-8">
              {/* Category */}
              <div>
                <label className="block text-[13px] font-medium text-fg">
                  What kind of problem did you find? <span className="text-amber">*</span>
                </label>
                <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {REPORT_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`flex items-center gap-2 rounded-xl border p-3 text-left text-[13px] transition-all ${
                        category === cat
                          ? 'border-accent bg-accent/10 font-medium text-fg shadow-sm'
                          : 'border-line bg-surface/50 text-fg2 hover:border-fg3 hover:bg-surface'
                      }`}
                    >
                      <span
                        className={`h-3 w-3 rounded-full border ${
                          category === cat ? 'border-accent bg-accent' : 'border-line'
                        }`}
                      />
                      <span>{reportCategoryLabels[cat]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Page URL */}
              <div>
                <label className="block text-[13px] font-medium text-fg">
                  Page where the issue happened
                </label>
                <input
                  type="text"
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  placeholder="e.g. /hackathons or specific URL"
                  className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2 text-[13px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[13px] font-medium text-fg">
                  What happened? What were you trying to do? <span className="text-amber">*</span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the unexpected behavior, steps to reproduce, or what looked incorrect..."
                  required
                  className="mt-1.5 w-full rounded-xl border border-line bg-canvas p-3 text-[13px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[13px] font-medium text-fg">
                  Your email <span className="text-fg3 font-normal">(optional — if you want follow-up on the fix)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@college.edu"
                  className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2 text-[13px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none"
                />
                {!user && (
                  <p className="mt-1.5 text-[11px] text-fg3">
                    You are reporting as a guest. Your report will be processed anonymously.
                  </p>
                )}
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-[13px] text-red-400">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
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
                    Submitting report...
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    Submit problem report
                  </>
                )}
              </Button>
            </Panel>
          </form>
        </Reveal>
      )}

      <div className="mt-10">
        <FeatureStatus
          featureKey="reports"
          status="LIVE"
          title="Student-First Bug Triage"
          description="Every issue submitted here is reviewed during our weekly student sprint triage. Want to help write the fix instead? Check out open contributor opportunities."
        />
      </div>
    </div>
  );
}
