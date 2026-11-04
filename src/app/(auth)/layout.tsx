import type { Metadata } from 'next';
import { constructMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = constructMetadata({
  title: 'Sign In / Register',
  description: 'Sign in to HackMate to find teammates, collaborate, and enter hackathons.',
  noIndex: true,
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">{children}</main>;
}
