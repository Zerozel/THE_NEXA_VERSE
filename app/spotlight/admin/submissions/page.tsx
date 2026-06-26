// app/spotlight/admin/submissions/page.tsx — SERVER COMPONENT shell
import type { Metadata } from 'next';
import ReviewQueue from '@/components/spotlight/admin/ReviewQueue';

export const metadata: Metadata = { title: 'Review Queue \u2014 Spotlight Admin' };

export default function SubmissionsQueuePage() {
  return (
    <div>
      <h1 className="text-xl font-black text-gray-900 mb-1" style={{ fontFamily: 'var(--font-headline)' }}>
        Review Queue
      </h1>
      <p className="text-gray-500 text-sm mb-6">Submissions waiting for a decision, newest first.</p>
      <ReviewQueue />
    </div>
  );
}
