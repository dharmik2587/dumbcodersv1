import type { Metadata } from 'next';
import { constructMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = constructMetadata({
  title: 'Team Workspace',
  description: 'Manage your active hackathon roster, role vacancies, and team chat.',
  noIndex: true,
});

export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
