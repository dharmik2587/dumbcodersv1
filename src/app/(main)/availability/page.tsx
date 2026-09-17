import CalendarPage from '../calendar/page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Availability & Calendar',
  description: 'Track hackathon deadlines and explore student builder weekly commitment windows.',
};

export default function AvailabilityPage() {
  return <CalendarPage />;
}
