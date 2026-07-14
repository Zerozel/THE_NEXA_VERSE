// app/api/spotlight/admin/content/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/spotlight/admin/content?page=0&pageSize=20&search=...&status=...
// Returns the paginated, searchable, status-filterable content queue.
// Mirrors Phase 4's submissions queue route structure exactly.
// Spotlight-admin only — already covered by Phase 4's
// '/api/spotlight/admin/:path*' middleware matcher, no middleware changes
// needed in this phase.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient }         from '@/lib/supabase-server';
import { requireSpotlightAdmin, adminErrorResponse } from '@/lib/spotlight/adminAuth';
import { getContentQueue }           from '@/lib/spotlight/content';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['pending_generation', 'generated', 'reviewed', 'approved', 'queued', 'published'];

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
  const status   = (searchParams.get('status') ?? '').trim();

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status filter.' }, { status: 400 });
  }

  try {
    const db     = createAdminClient();
    const result = await getContentQueue(db, page, pageSize, search, status);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/spotlight/admin/content]', err);
    return NextResponse.json({ error: 'Could not load the content queue.' }, { status: 500 });
  }
}
