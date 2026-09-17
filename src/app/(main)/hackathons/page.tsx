import Discover from '../discover/page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hackathons',
  description: 'Explore active college and open hackathons with verified prizes and registration deadlines.',
};

export default function HackathonsPage() {
  return <Discover />;
}
