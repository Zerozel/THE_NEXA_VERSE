// components/spotlight/admin/ReviewHistory.tsx
import type { ReviewLogEntry } from '@/lib/spotlight/types';

const ACTION_LABELS: Record<string, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  flagged:  'Flagged',
};

export default function ReviewHistory({ logs }: { logs: ReviewLogEntry[] }) {
  if (logs.length === 0) {
    return (
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 text-center">
        <p className="text-gray-400 text-sm">No review actions yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">
        Review History
      </p>
      <div className="space-y-4">
        {logs.map(log => (
          <div key={log.id} className="border-l-2 border-gray-100 pl-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm font-bold text-gray-800">
                {ACTION_LABELS[log.action] ?? log.action}
              </span>
              <span className="text-gray-400 text-xs shrink-0">
                {new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' \u00b7 '}
                {new Date(log.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-gray-500 text-xs mb-1">by {log.reviewer_email}</p>
            {log.note && (
              <p className="text-gray-700 text-sm bg-gray-50 rounded-lg px-3 py-2 mt-1 leading-relaxed">
                {log.note}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
