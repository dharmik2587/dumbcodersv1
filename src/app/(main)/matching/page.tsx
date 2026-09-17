import MatchPage from '../match/page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Matching & Compatibility',
  description: 'Smart hackathon teammate matching based on skill gap closure and schedule overlap.',
};

export default function MatchingPage() {
  return <MatchPage />;
}
