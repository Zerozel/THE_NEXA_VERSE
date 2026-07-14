// app/spotlight/admin/content/page.tsx — SERVER COMPONENT shell
import type { Metadata } from 'next';
import ContentQueue from '@/components/spotlight/admin/ContentQueue';

export const metadata: Metadata = { title: 'Content Queue \u2014 Spotlight Admin' };

export default function ContentQueuePage() {
  return (
    <div>
      <h1 className="text-xl font-black text-gray-900 mb-1" style={{ fontFamily: 'var(--font-headline)' }}>
        Content Queue
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        Content assets created from approved Spotlights, waiting for generation.
      </p>
      <ContentQueue />
    </div>
  );
}
