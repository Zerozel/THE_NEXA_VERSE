// app/api/spotlight/admin/profiles/[submissionId]/unpublish/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/spotlight/admin/profiles/[submissionId]/unpublish
// Unpublishes a profile from the public feed.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getAuthenticatedAdmin, adminErrorResponse } from '@/lib/spotlight/adminAuth';
import { unpublishProfile } from '@/lib/spotlight/profiles';

export const dynamic = 'force-dynamic';

type Params = { params: { submissionId: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await getAuthenticatedAdmin();
  } catch (err) {
    return adminErrorResponse(err);
  }

  const { submissionId } = params;
  if (!UUID_RE.test(submissionId)) {
    return NextResponse.json(
      { error: 'Invalid submission id.', code: 'invalid_input' },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  try {
    await unpublishProfile(db, submissionId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /unpublish]', err);
    if (err instanceof Error) {
      return NextResponse.json(
        { error: err.message, code: 'unpublish_failed' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to unpublish profile.', code: 'server_error' },
      { status: 500 }
    );
  }
}
