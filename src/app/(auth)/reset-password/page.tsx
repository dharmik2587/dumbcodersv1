'use client';

import { Suspense, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updatePassword } from '@/client/lib/auth';
import { Panel, Reveal, Button } from '@/components/ui';
import { ArrowRight, CheckCircle, KeyRound, Loader2 } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => {
        router.push('/sign-in');
      }, 2500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
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
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
              <KeyRound size={20} />
            </div>
            <h1 className="display text-2xl font-medium text-fg">Reset password</h1>
            <p className="mt-2 text-[14px] text-fg2">Enter your new secure password below</p>
          </div>

          <div className="px-8 py-6 space-y-6">
            {errorMsg && (
              <div className="rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3 text-[13px] text-red-400">
                {errorMsg}
              </div>
            )}

            {success ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle size={40} className="mx-auto text-mint animate-bounce" />
                <h3 className="text-lg font-medium text-fg">Password updated</h3>
                <p className="text-sm text-fg2">
                  Your password has been changed successfully. Redirecting you to sign in...
                </p>
                <div className="pt-2">
                  <Link href="/sign-in">
                    <Button variant="outline" size="sm">
                      Go to Sign in now
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-mono text-[10.5px] uppercase tracking-wider text-fg2">New password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-none border border-line bg-raised px-3.5 py-2.5 text-[14px] text-fg placeholder-fg3/50 outline-none transition-colors focus:border-accent-line focus:bg-surface"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10.5px] uppercase tracking-wider text-fg2">Confirm password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-none border border-line bg-raised px-3.5 py-2.5 text-[14px] text-fg placeholder-fg3/50 outline-none transition-colors focus:border-accent-line focus:bg-surface"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 mt-2"
                  disabled={loading}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Set new password'}
                  {!loading && <ArrowRight size={15} />}
                </Button>
              </form>
            )}
          </div>

          <div className="border-t border-line bg-raised px-8 py-5 text-center">
            <p className="text-[13px] text-fg2">
              Remember your password?{' '}
              <Link href="/sign-in" className="text-accent hover:text-accent-ink transition-colors font-medium">
                Back to sign in
              </Link>
            </p>
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-canvas">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
