import type { Metadata } from 'next';
import { getProfileById } from '@/lib/db/queries/profiles';
import { BUILDERS } from '@/client/data/seed';
import { constructMetadata } from '@/lib/seo/metadata';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  try {
    const profile = await getProfileById(id);
    if (profile) {
      const name = profile.fullName || profile.username;
      const skills = profile.skills?.join(', ') || 'Software Development';
      return constructMetadata({
        title: `${name} (@${profile.username}) · Builder Profile`,
        description: `${name}'s technical builder profile on HackMate. Skills: ${skills}. ${profile.bio || 'Find complementary hackathon teammates.'}`,
        path: `/b/${id}`,
        type: 'profile',
      });
    }
  } catch (err) {
    console.warn(`Error resolving builder profile ${id} for metadata`, err);
  }

  const seed = BUILDERS.find((b) => b.id === id);
  if (seed) {
    return constructMetadata({
      title: `${seed.name} (@${seed.handle}) · Builder Profile`,
      description: `${seed.name}'s builder profile on HackMate. Role: ${seed.role}. Skills: ${seed.skills.map((s) => s.label).join(', ')}. ${seed.bio}`,
      path: `/b/${id}`,
      type: 'profile',
    });
  }

  return constructMetadata({
    title: 'Builder Profile',
    description: 'Student developer profile on HackMate.',
    path: `/b/${id}`,
  });
}

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
