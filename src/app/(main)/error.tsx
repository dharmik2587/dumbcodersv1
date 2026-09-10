'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client error for telemetry/debugging
    console.error('Unhandled route error in (main):', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-20 px-4 text-center">
      <div className="rounded-2xl border border-red-500/30 bg-surface/80 p-8 backdrop-blur-xl shadow-2xl space-y-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-xl font-bold">
          !
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs uppercase tracking-widest text-red-400/80">
            Runtime Error
          </span>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Something went wrong
          </h2>
          <p className="text-sm text-subtle max-w-md mx-auto">
            An unexpected error occurred while loading this section. You can try refreshing the component or return to home.
          </p>
          {error.digest && (
            <p className="font-mono text-[11px] text-muted">
              Digest ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto rounded-xl bg-accent px-6 py-2.5 text-xs font-semibold text-black transition-all hover:opacity-90 active:scale-95"
          >
            Try Again
          </button>
          <Link
            href="/b"
            className="w-full sm:w-auto rounded-xl border border-line bg-raised/50 px-6 py-2.5 text-xs font-semibold text-foreground transition-all hover:bg-raised active:scale-95"
          >
            Return to Feed
          </Link>
        </div>
      </div>
    </div>
  );
}
