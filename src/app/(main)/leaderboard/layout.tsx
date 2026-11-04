import type { Metadata } from 'next';
import { constructMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = constructMetadata({
  title: 'Top Student Builders Leaderboard',
  description:
    'Explore the top hackathon builders ranked by verified GitHub activity, LeetCode ratings, and hackathon wins across colleges.',
  path: '/leaderboard',
  keywords: [
    'hackathon leaderboard',
    'top student developers India',
    'leetcode rankings college',
    'github activity leaderboard',
    'student builder score',
  ],
});

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
