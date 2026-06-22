// app/spotlight/track/page.tsx — SERVER COMPONENT
import type { Metadata } from 'next';
import TrackingLookupForm from '@/components/spotlight/tracking/TrackingLookupForm';

export const metadata: Metadata = { title: 'Track Your Spotlight' };

export default function TrackLookupPage() {
  return (
    <div className="max-w-md mx-auto py-6">
      <div className="text-center mb-8">
        <p className="text-3xl mb-3">🔦</p>
        <h1 className="text-2xl font-black text-gray-900 mb-2" style={{ fontFamily: 'var(--font-headline)' }}>
          Track Your Spotlight
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Enter the tracking code you received after submitting your application.
        </p>
      </div>
      <TrackingLookupForm />
    </div>
  );
}
