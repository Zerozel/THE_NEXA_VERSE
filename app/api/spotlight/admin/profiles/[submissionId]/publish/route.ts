// app/api/spotlight/admin/profiles/[submissionId]/publish/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/spotlight/admin/profiles/[submissionId]/publish
// Publishes a profile to the public feed.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getAuthenticatedAdmin, adminErrorResponse } from '@/lib/spotlight/adminAuth';
import { publishProfile } from '@/lib/spotlight/profiles';

export const dynamic = 'force-dynamic';

type Params = { params: { submissionId: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest, { params }: Params) {
  let admin;
  try {
    admin = await getAuthenticatedAdmin();
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
    const result = await publishProfile(db, submissionId, admin.id);
    return NextResponse.json({
      ok: true,
      slug: result.slug,
      profile_id: result.profileId,
    });
  } catch (err) {
    console.error('[POST /publish]', err);
    if (err instanceof Error) {
      return NextResponse.json(
        { error: err.message, code: 'publish_failed' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to publish profile.', code: 'server_error' },
      { status: 500 }
    );
  }
}
