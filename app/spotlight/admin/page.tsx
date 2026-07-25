// app/spotlight/admin/page.tsx
// REPLACE YOUR EXISTING FILE WITH THIS COMPLETE VERSION
// Cumulative dashboard from Phases 4 + 5A + 5C + 6A — all sections wired

import Link from 'next/link';
import { createAdminClient }          from '@/lib/supabase-server';
import { getAdminDashboardSummary }   from '@/lib/spotlight/adminReview';
import { getContentMetrics }          from '@/lib/spotlight/content';
import { getAdminProfilesList }       from '@/lib/spotlight/profiles';
import AdminDashboardSummary          from '@/components/spotlight/admin/AdminDashboardSummary';
import ContentMetricsSummary          from '@/components/spotlight/admin/ContentMetricsSummary';

export const dynamic = 'force-dynamic';

export default async function SpotlightAdminDashboard() {
  const db = createAdminClient();

  const [summary, contentMetrics, profilesData] = await Promise.all([
    getAdminDashboardSummary(db),
    getContentMetrics(db),
    getAdminProfilesList(db, 0, 100),
  ]);

  const publishedCount = profilesData.items.filter(i => i.is_public).length;
  const readyCount     = profilesData.items.filter(
    i => !i.is_public && i.approved_content_count > 0
  ).length;

  return (
    <div>
      <h1
        className="text-xl font-black text-gray-900 mb-1"
        style={{ fontFamily: 'var(--font-headline)' }}
      >
        Spotlight Admin
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        Full workflow — from submissions to published profiles.
      </p>

      {/* ── STEP 1: SUBMISSIONS ──────────────────────────────────────── */}
      <div className="mb-2">
        <p className="text-[0.65rem] font-black text-gray-400 uppercase tracking-wider mb-2">
          Step 1 — Review Submissions
        </p>
        <AdminDashboardSummary summary={summary} />
        <Link
          href="/spotlight/admin/submissions"
          className="block w-full bg-[#D4AF37] text-black font-bold text-center
                     py-3 rounded-xl text-sm hover:bg-[#C9A227] transition-colors mt-3 mb-6"
        >
          Open Review Queue →
        </Link>
      </div>

      {/* ── STEP 2: AI CONTENT ────────────────────────────────────────── */}
      <div className="mb-2">
        <p className="text-[0.65rem] font-black text-gray-400 uppercase tracking-wider mb-2">
          Step 2 — Generate &amp; Review AI Content
        </p>
        <ContentMetricsSummary metrics={contentMetrics} />
        <Link
          href="/spotlight/admin/content"
          className="block w-full bg-gray-900 text-white font-bold text-center
                     py-3 rounded-xl text-sm hover:bg-black transition-colors mt-3 mb-6"
        >
          Open Content Queue →
        </Link>
      </div>

      {/* ── STEP 3: PUBLISH PROFILES ──────────────────────────────────── */}
      <div className="mb-2">
        <p className="text-[0.65rem] font-black text-gray-400 uppercase tracking-wider mb-2">
          Step 3 — Publish Profiles
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-2xl p-4 bg-green-50">
            <p className="text-2xl font-black text-green-600">{publishedCount}</p>
            <p className="text-gray-500 text-xs font-semibold mt-1">Published</p>
          </div>
          <Link
            href="/spotlight/admin/profiles"
            className="rounded-2xl p-4 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 transition-colors"
          >
            <p className="text-2xl font-black text-[#C9A227]">{readyCount}</p>
            <p className="text-gray-500 text-xs font-semibold mt-1">Ready to Publish</p>
          </Link>
        </div>
        <Link
          href="/spotlight/admin/profiles"
          className="block w-full bg-white border border-gray-200 text-gray-700 font-bold
                     text-center py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors"
        >
          Manage Profiles →
        </Link>
      </div>
    </div>
  );
}
