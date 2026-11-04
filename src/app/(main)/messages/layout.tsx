import type { Metadata } from 'next';
import { constructMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = constructMetadata({
  title: 'Direct Messages',
  description: 'Private communications between hackathon builders.',
  noIndex: true,
});

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
