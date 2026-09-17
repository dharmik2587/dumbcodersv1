'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Bug, Sparkles, X } from 'lucide-react';
import { cn } from '@/client/utils/cn';

export function BetaBadge({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        className={cn(
          'group inline-flex items-center gap-1.5 rounded-full border border-amber/40 bg-amber/10 px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-amber transition-all hover:border-amber/70 hover:bg-amber/20',
          className
        )}
        title="HackMate is in active beta — click to learn more"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber animate-pulse" />
        <span>BETA</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl animate-in zoom-in-95">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-fg3 transition-colors hover:bg-surface-2 hover:text-fg"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber/30 bg-amber/10 text-amber">
                <Sparkles size={16} />
              </span>
              <div>
                <h3 className="text-base font-semibold text-fg">HackMate is in Beta</h3>
                <p className="font-mono text-[11px] uppercase tracking-wider text-fg3">
                  v0.9 · Student-Built & Evolving
                </p>
              </div>
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-fg2">
              We&apos;re actively building and testing the platform between classes and hackathons.
              Some features, integrations, and external data may be incomplete or behave unexpectedly.
            </p>

            <p className="mt-2 text-[13px] leading-relaxed text-fg2">
              Instead of hiding bugs behind corporate gloss, we build in public and welcome your feedback.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                href="/report-problem"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between rounded-xl border border-line bg-canvas/60 px-4 py-3 text-[13px] font-medium text-fg transition-all hover:border-amber/40 hover:bg-surface-2"
              >
                <span className="flex items-center gap-2">
                  <Bug size={15} className="text-amber" />
                  Found something broken? Report it
                </span>
                <ArrowRight size={14} className="text-fg3" />
              </Link>

              <Link
                href="/changelog"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between rounded-xl border border-line bg-canvas/60 px-4 py-3 text-[13px] font-medium text-fg transition-all hover:border-fg3 hover:bg-surface-2"
              >
                <span className="flex items-center gap-2">
                  <AlertCircle size={15} className="text-mint" />
                  View beta changelog & roadmap
                </span>
                <ArrowRight size={14} className="text-fg3" />
              </Link>

              <Link
                href="/careers"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between rounded-xl border border-line bg-canvas/60 px-4 py-3 text-[13px] font-medium text-fg transition-all hover:border-accent/40 hover:bg-surface-2"
              >
                <span className="flex items-center gap-2">
                  <Sparkles size={15} className="text-accent" />
                  Want to help build HackMate? Join us
                </span>
                <ArrowRight size={14} className="text-fg3" />
              </Link>
            </div>

            <div className="mt-5 border-t border-line pt-4 text-center">
              <button
                onClick={() => setIsOpen(false)}
                className="text-[12px] font-medium text-fg3 hover:text-fg"
              >
                Continue exploring
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
