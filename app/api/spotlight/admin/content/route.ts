// app/api/spotlight/admin/content/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/spotlight/admin/content
// Returns paginated content items for the admin content queue.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { requireSpotlightAdmin, adminErrorResponse } from '@/lib/spotlight/adminAuth';
import { getContentQueue } from '@/lib/spotlight/content';
import type { ContentQueueResponse } from '@/lib/spotlight/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireSpotlightAdmin();
  } catch (err) {
    return adminErrorResponse(err);
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '0');
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 50);
  const search = searchParams.get('search') || '';  // ← default to empty string
  const status = searchParams.get('status') || '';  // ← default to empty string

  const db = createAdminClient();

  try {
    const result = await getContentQueue(db, page, pageSize, search, status);
    return NextResponse.json(result as ContentQueueResponse);
  } catch (error) {
    console.error('[GET /admin/content]', error);
    return NextResponse.json(
      { error: 'Failed to load content queue.', code: 'server_error' },
      { status: 500 }
    );
  }
}
