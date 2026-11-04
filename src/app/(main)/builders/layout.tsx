import type { Metadata } from 'next';
import { constructMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = constructMetadata({
  title: 'Student Builders & Hackathon Teammates',
  description:
    'Discover student developers, UI/UX designers, backend architects, and ML engineers looking for hackathon teams. Filter by verified skills, college, and role preference.',
  path: '/builders',
  keywords: [
    'student developers',
    'hackathon builders',
    'find frontend developer for hackathon',
    'find backend developer hackathon',
    'find AI engineer hackathon',
    'college coders India',
    'hackathon teammate directory',
  ],
});

export default function BuildersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
