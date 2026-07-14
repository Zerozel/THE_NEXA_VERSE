// components/spotlight/admin/ContentMetricsSummary.tsx
// Full replacement of the Phase 5A version.
// All three metrics are real DB counts — no fabricated zeros, no placeholders.
import Link from 'next/link';
import type { ContentMetricsData } from '@/lib/spotlight/types';

export default function ContentMetricsSummary({ metrics }: { metrics: ContentMetricsData }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
        Content Pipeline
      </p>

      <div className="grid grid-cols-3 gap-3">
        {/* Pending Generation — existing, unchanged */}
        <Link
          href="/spotlight/admin/content?status=pending_generation"
          className="rounded-2xl p-4 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          <p className="text-2xl font-black text-blue-600">{metrics.pending_generation}</p>
          <p className="text-gray-500 text-xs font-semibold mt-1">Pending Generation</p>
        </Link>

        {/* Generated — Phase 5B-2: now a real count */}
        <Link
          href="/spotlight/admin/content?status=generated"
          className="rounded-2xl p-4 bg-green-50 hover:bg-green-100 transition-colors"
        >
          <p className="text-2xl font-black text-green-600">{metrics.generated_items}</p>
          <p className="text-gray-500 text-xs font-semibold mt-1">Generated</p>
        </Link>

        {/* Total Versions — Phase 5B-2: real count from spotlight_content_versions */}
        <div className="rounded-2xl p-4 bg-gray-50">
          <p className="text-2xl font-black text-gray-700">{metrics.total_versions}</p>
          <p className="text-gray-500 text-xs font-semibold mt-1">Total Versions</p>
        </div>
      </div>
    </div>
  );
}
