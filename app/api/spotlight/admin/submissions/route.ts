// app/api/spotlight/admin/submissions/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/spotlight/admin/submissions?page=0&pageSize=20&search=...
// Returns the paginated, searchable review queue. Spotlight-admin only.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient }         from '@/lib/supabase-server';
import { requireSpotlightAdmin, adminErrorResponse } from '@/lib/spotlight/adminAuth';
import { getSubmissionQueue }        from '@/lib/spotlight/adminReview';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireSpotlightAdmin();
  } catch (err) {
    return adminErrorResponse(err);
  }

  const { searchParams } = new URL(req.url);
  const page     = Math.max(parseInt(searchParams.get('page') ?? '0', 10) || 0, 0);
  const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') ?? '20', 10) || 20, 1), 50);
  const search   = (searchParams.get('search') ?? '').trim().slice(0, 100);

  try {
    const db     = createAdminClient();
    const result = await getSubmissionQueue(db, page, pageSize, search);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/spotlight/admin/submissions]', err);
    return NextResponse.json({ error: 'Could not load the review queue.' }, { status: 500 });
  }
}
