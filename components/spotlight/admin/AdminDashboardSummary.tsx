// components/spotlight/admin/AdminDashboardSummary.tsx
import type { AdminDashboardSummaryData } from '@/lib/spotlight/types';

export default function AdminDashboardSummary({ summary }: { summary: AdminDashboardSummaryData }) {
  const cards = [
    { label: 'Pending Review', value: summary.pending_count,  tone: 'text-blue-600',  bg: 'bg-blue-50'  },
    { label: 'Flagged',        value: summary.flagged_count,  tone: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Approved',       value: summary.approved_count, tone: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Rejected',       value: summary.rejected_count, tone: 'text-gray-500',  bg: 'bg-gray-50'  },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {cards.map(c => (
        <div key={c.label} className={`rounded-2xl p-4 ${c.bg}`}>
          <p className={`text-2xl font-black ${c.tone}`}>{c.value}</p>
          <p className="text-gray-500 text-xs font-semibold mt-1">{c.label}</p>
        </div>
      ))}
    </div>
  );
}
