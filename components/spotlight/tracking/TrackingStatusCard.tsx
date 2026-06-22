// components/spotlight/tracking/TrackingStatusCard.tsx
import StatusMessage from './StatusMessage';
import type { TrackingInfo } from '@/lib/spotlight/types';

export default function TrackingStatusCard({
  info, token,
}: { info: TrackingInfo; token: string }) {
  const submittedDate = info.submitted_at
    ? new Date(info.submitted_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
      <p className="text-[0.65rem] font-black text-gray-400 uppercase tracking-wider mb-1">
        Tracking Code
      </p>
      <code className="text-sm font-mono text-gray-700 break-all block mb-4">
        {token}
      </code>

      <StatusMessage config={info.current_stage} />

      {submittedDate && (
        <p className="text-gray-400 text-xs mt-4">Submitted on {submittedDate}</p>
      )}

      {info.next_stage && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-gray-400 text-xs">
            Next: <span className="text-gray-600 font-medium">{info.next_stage.label}</span>
          </p>
        </div>
      )}
    </div>
  );
}
