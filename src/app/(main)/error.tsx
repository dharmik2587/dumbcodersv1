'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type ErrorKind = 'auth' | 'network' | 'server';

function classifyError(error: Error): ErrorKind {
  const msg = error.message?.toLowerCase() ?? '';
  if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('unauthenticated') || msg.includes('401')) return 'auth';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch') || msg.includes('connection')) return 'network';
  return 'server';
}

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const kind = classifyError(error);

  useEffect(() => {
    console.error('Unhandled route error in (main):', error);
  }, [error]);

  const config = {
    auth: {
      icon: '🔐',
      label: 'Session Expired',
      title: 'You need to sign in',
      body: 'Your session has expired or you no longer have access. Sign in to continue.',
      primary: { label: 'Sign in', action: () => router.push('/sign-in') },
      secondary: { label: 'Go home', href: '/' },
    },
    network: {
      icon: '📡',
      label: 'Connection Issue',
      title: 'Network error',
      body: 'Could not reach the server. Check your connection and try again.',
      primary: { label: 'Retry', action: reset },
      secondary: { label: 'Return to feed', href: '/discover' },
    },
    server: {
      icon: '!',
      label: 'Runtime Error',
      title: 'Something went wrong',
      body: 'An unexpected error occurred while loading this section.',
      primary: { label: 'Try again', action: reset },
      secondary: { label: 'Return to feed', href: '/discover' },
    },
  }[kind];

  return (
    <div className="mx-auto max-w-xl py-20 px-4 text-center">
      <div className="rounded-2xl border border-red-500/30 bg-surface/80 p-8 backdrop-blur-xl shadow-2xl space-y-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-xl font-bold">
          {config.icon}
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs uppercase tracking-widest text-red-400/80">
            {config.label}
          </span>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {config.title}
          </h2>
          <p className="text-sm text-subtle max-w-md mx-auto">
            {config.body}
          </p>
          {kind === 'server' && error.digest && (
            <p className="font-mono text-[11px] text-muted">
              Request ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={config.primary.action}
            className="w-full sm:w-auto rounded-xl bg-accent px-6 py-2.5 text-xs font-semibold text-black transition-all hover:opacity-90 active:scale-95"
          >
            {config.primary.label}
          </button>
          <Link
            href={'secondary' in config && 'href' in config.secondary ? config.secondary.href : '/discover'}
            className="w-full sm:w-auto rounded-xl border border-line bg-raised/50 px-6 py-2.5 text-xs font-semibold text-foreground transition-all hover:bg-raised active:scale-95"
          >
            {config.secondary.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
