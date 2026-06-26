// app/spotlight/admin/page.tsx — SERVER COMPONENT
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase-server';
import { getAdminDashboardSummary } from '@/lib/spotlight/adminReview';
import AdminDashboardSummary from '@/components/spotlight/admin/AdminDashboardSummary';

export const dynamic = 'force-dynamic';

export default async function SpotlightAdminDashboard() {
  const db = createAdminClient();
  const summary = await getAdminDashboardSummary(db);

  return (
    <div>
      <h1 className="text-xl font-black text-gray-900 mb-1" style={{ fontFamily: 'var(--font-headline)' }}>
        Review Dashboard
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        An overview of Spotlight submissions awaiting your attention.
      </p>

      <AdminDashboardSummary summary={summary} />

      <Link
        href="/spotlight/admin/submissions"
        className="block w-full bg-[#D4AF37] text-black font-bold text-center py-3.5 rounded-xl text-sm hover:bg-[#C9A227] transition-colors"
      >
        Open Review Queue \u2192
      </Link>
    </div>
  );
}
