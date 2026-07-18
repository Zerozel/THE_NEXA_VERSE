// components/spotlight/admin/ContentMetricsSummary.tsx
// Phase 5C: all six metrics are real DB counts.
import Link from 'next/link';
import type { ContentMetricsData } from '@/lib/spotlight/types';

export default function ContentMetricsSummary({ metrics }: { metrics: ContentMetricsData }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
        Content Pipeline
      </p>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <Link
          href="/spotlight/admin/content?status=pending_generation"
          className="rounded-2xl p-4 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          <p className="text-2xl font-black text-blue-600">{metrics.pending_generation}</p>
          <p className="text-gray-500 text-xs font-semibold mt-1">Pending Generation</p>
        </Link>

        <Link
          href="/spotlight/admin/content?status=generated"
          className="rounded-2xl p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <p className="text-2xl font-black text-gray-700">{metrics.generated_items}</p>
          <p className="text-gray-500 text-xs font-semibold mt-1">Generated</p>
        </Link>

        <Link
          href="/spotlight/admin/content?status=approved"
          className="rounded-2xl p-4 bg-green-50 hover:bg-green-100 transition-colors"
        >
          <p className="text-2xl font-black text-green-600">{metrics.approved_items}</p>
          <p className="text-gray-500 text-xs font-semibold mt-1">Approved</p>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Link
          href="/spotlight/admin/content?status=needs_revision"
          className="rounded-2xl p-4 bg-amber-50 hover:bg-amber-100 transition-colors"
        >
          <p className="text-2xl font-black text-amber-600">{metrics.needs_revision}</p>
          <p className="text-gray-500 text-xs font-semibold mt-1">Needs Revision</p>
        </Link>

        <Link
          href="/spotlight/admin/content?status=rejected"
          className="rounded-2xl p-4 bg-red-50 hover:bg-red-100 transition-colors"
        >
          <p className="text-2xl font-black text-red-500">{metrics.rejected_items}</p>
          <p className="text-gray-500 text-xs font-semibold mt-1">Rejected</p>
        </Link>

        <div className="rounded-2xl p-4 bg-gray-50">
          <p className="text-2xl font-black text-gray-700">{metrics.total_versions}</p>
          <p className="text-gray-500 text-xs font-semibold mt-1">Total Versions</p>
        </div>
      </div>
    </div>
  );
}
