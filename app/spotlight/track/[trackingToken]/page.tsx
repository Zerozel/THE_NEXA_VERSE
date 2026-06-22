// app/spotlight/track/[trackingToken]/page.tsx — SERVER COMPONENT
import type { Metadata } from 'next';
import {
  fetchTrackingInfo,
  TrackingLookupError,
  isValidTrackingTokenFormat,
} from '@/lib/spotlight/tracking';
import TrackingStatusCard  from '@/components/spotlight/tracking/TrackingStatusCard';
import TrackingTimeline    from '@/components/spotlight/tracking/TrackingTimeline';
import TrackingHelpSection from '@/components/spotlight/tracking/TrackingHelpSection';
import TrackingErrorState  from '@/components/spotlight/tracking/TrackingErrorState';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Spotlight Tracking' };

type Params = { params: { trackingToken: string } };

export default async function TrackingDetailPage({ params }: Params) {
  const { trackingToken } = params;

  // ── Reject obviously malformed tokens before any network call ──────────
  if (!isValidTrackingTokenFormat(trackingToken)) {
    return (
      <div className="max-w-md mx-auto">
        <TrackingErrorState
          title="Invalid Tracking Code"
          message="That tracking code doesn't look right. Double check it and try again."
        />
      </div>
    );
  }

  try {
    const info = await fetchTrackingInfo(trackingToken);

    return (
      <div className="max-w-md mx-auto py-6">
        <TrackingStatusCard info={info} token={trackingToken} />
        <TrackingTimeline events={info.timeline_events} />
        <TrackingHelpSection />
      </div>
    );
  } catch (err) {
    const isNotFound = err instanceof TrackingLookupError && err.code === 'not_found';

    return (
      <div className="max-w-md mx-auto">
        <TrackingErrorState
          title={isNotFound ? 'Application Not Found' : 'Something Went Wrong'}
          message={
            isNotFound
              ? 'We could not find a Spotlight application with that tracking code. Please check and try again.'
              : 'We had trouble loading your tracking information. Please try again shortly.'
          }
        />
      </div>
    );
  }
}
