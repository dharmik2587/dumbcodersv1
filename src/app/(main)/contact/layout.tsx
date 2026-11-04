import type { Metadata } from 'next';
import { constructMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = constructMetadata({
  title: 'Contact Us & Community Support',
  description:
    'Get in touch with the HackMate team. Send feedback, report an issue, inquire about campus ambassador partnerships, or request platform integrations.',
  path: '/contact',
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
