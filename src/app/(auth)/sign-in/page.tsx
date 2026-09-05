'use client';

import { Suspense, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApiStore } from '@/client/store/apiStore';
import { Panel, Reveal, Button, Label } from '@/components/ui';
import { cn } from '@/client/utils/cn';
import { ArrowRight, Loader2 } from 'lucide-react';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/discover';
  const callbackError = searchParams.get('error');

  const signIn = useApiStore((s) => s.signIn);
  const signInWithOAuth = useApiStore((s) => s.signInWithOAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'github' | 'google' | null>(null);

  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (!supabaseConfigured) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-canvas p-5">
        <Panel className="max-w-md w-full p-8 text-center">
          <Label tone="muted">Configuration Error</Label>
          <h1 className="mt-4 text-2xl font-medium text-fg">Supabase is not configured</h1>
          <p className="mt-3 text-sm text-fg2 leading-relaxed">
            Add the Supabase keys from <code className="font-mono text-accent">.env.example</code> to enable authentication.
          </p>
        </Panel>
      </div>
    );
  }

  const handleEmailSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      router.push(redirectTo);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'github' | 'google') => {
    setOauthLoading(provider);
    try {
      await signInWithOAuth(provider, redirectTo);
    } catch (err) {
      setOauthLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-canvas p-5 relative overflow-hidden">
      {/* Background decorations */}
      <div className="tech-cols pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, var(--accent), transparent 60%)', opacity: 0.08 }}
        aria-hidden
      />

      <Reveal className="relative z-10 w-full max-w-[440px]">
        <Panel className="overflow-hidden">
          <div className="border-b border-line px-8 py-6 text-center">
            <h1 className="display text-2xl font-medium text-fg">Welcome back</h1>
            <p className="mt-2 text-[14px] text-fg2">Sign in to your HackMate account</p>
          </div>

          <div className="px-8 py-6 space-y-6">
            {callbackError && (
              <div className="rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3 text-[13px] text-red-400">
                Authentication failed. Please try again.
              </div>
            )}

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-11"
                disabled={Boolean(oauthLoading) || loading}
                onClick={() => handleOAuthSignIn('github')}
              >
                {oauthLoading === 'github' ? (
                  <Loader2 size={15} className="animate-spin text-fg3" />
                ) : (
                  <svg className="h-[15px] w-[15px] fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                )}
                <span>Continue with GitHub</span>
              </Button>
              <Button
                variant="outline"
                className="w-full h-11"
                disabled={Boolean(oauthLoading) || loading}
                onClick={() => handleOAuthSignIn('google')}
              >
                {oauthLoading === 'google' ? (
                  <Loader2 size={15} className="animate-spin text-fg3" />
                ) : (
                  <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                )}
                <span>Continue with Google</span>
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-fg3">or</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-mono text-[10.5px] uppercase tracking-wider text-fg2">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="builder@example.com"
                  className="w-full rounded-none border border-line bg-raised px-3.5 py-2.5 text-[14px] text-fg placeholder-fg3/50 outline-none transition-colors focus:border-accent-line focus:bg-surface"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-[10.5px] uppercase tracking-wider text-fg2">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-none border border-line bg-raised px-3.5 py-2.5 text-[14px] text-fg placeholder-fg3/50 outline-none transition-colors focus:border-accent-line focus:bg-surface"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 mt-2"
                disabled={loading || Boolean(oauthLoading)}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
                {!loading && <ArrowRight size={15} />}
              </Button>
            </form>
          </div>
          
          <div className="border-t border-line bg-raised px-8 py-5 text-center">
            <p className="text-[13px] text-fg2">
              Don&apos;t have an account?{' '}
              <Link href="/sign-up" className="text-accent hover:text-accent-ink transition-colors font-medium">
                Create profile
              </Link>
            </p>
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-canvas">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
