// app/spotlight/admin/page.tsx — SERVER COMPONENT (updated)
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase-server';
import { getAdminDashboardSummary } from '@/lib/spotlight/adminReview';
import { getContentMetrics }         from '@/lib/spotlight/content';
import AdminDashboardSummary  from '@/components/spotlight/admin/AdminDashboardSummary';
import ContentMetricsSummary  from '@/components/spotlight/admin/ContentMetricsSummary';
import { getAdminProfilesList } from '@/lib/spotlight/profiles';


export const dynamic = 'force-dynamic';

export default async function SpotlightAdminDashboard() {
  const db = createAdminClient();
  const [summary, contentMetrics, profilesData] = await Promise.all([
    getAdminDashboardSummary(db),
    getContentMetrics(db),
    getAdminProfilesList(db, 0, 3),
  ]);

  return (
    <div>
      <h1 className="text-xl font-black text-gray-900 mb-1" style={{ fontFamily: 'var(--font-headline)' }}>
        Review Dashboard
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        An overview of Spotlight submissions awaiting your attention.
      </p>

      <AdminDashboardSummary summary={summary} />
      <ContentMetricsSummary metrics={contentMetrics} />

      <div className="mb-6">
        <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Profiles</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-2xl p-4 bg-gray-50">
            <p className="text-2xl font-black text-gray-700">
              {profilesData.items.filter(i => i.is_public).length}
            </p>
            <p className="text-gray-500 text-xs font-semibold mt-1">Published</p>
          </div>
          <div className="rounded-2xl p-4 bg-gray-50">
            <p className="text-2xl font-black text-gray-700">
              {profilesData.items.filter(i => !i.is_public && i.approved_content_count > 0).length}
            </p>
            <p className="text-gray-500 text-xs font-semibold mt-1">Ready to Publish</p>
          </div>
        </div>
        <Link
          href="/spotlight/admin/profiles"
          className="block w-full text-center text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 py-3 rounded-xl transition-colors"
        >
          Manage Profiles →
        </Link>
      </div>

      <Link
        href="/spotlight/admin/submissions"
        className="block w-full bg-[#D4AF37] text-black font-bold text-center py-3.5 rounded-xl text-sm hover:bg-[#C9A227] transition-colors"
      >
        Open Review Queue →
      </Link>
    </div>
  );
}
