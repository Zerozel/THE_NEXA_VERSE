// app/api/spotlight/admin/profiles/[submissionId]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient }         from '@/lib/supabase-server';
import { getAuthenticatedAdmin, adminErrorResponse } from '@/lib/spotlight/adminAuth';
import { publishProfile, ProfileServiceError } from '@/lib/spotlight/profiles';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function statusForCode(code: string): number {
  if (code === 'missing_submission')          return 404;
  if (code === 'already_published')           return 409;
  if (code === 'invalid_submission_status')   return 422;
  return 500;
}

type Params = { params: { submissionId: string } };

export async function POST(_req: NextRequest, { params }: Params) {
  let admin: { id: string; email: string };
  try {
    admin = await getAuthenticatedAdmin();
  } catch (err) {
    return adminErrorResponse(err);
  }

  const { submissionId } = params;
  if (!UUID_RE.test(submissionId)) {
    return NextResponse.json({ error: 'Invalid submission id.', code: 'invalid_input' }, { status: 400 });
  }

  const db = createAdminClient();

  try {
    const result = await publishProfile(db, submissionId, admin.id);
    return NextResponse.json({ ok: true, slug: result.slug, profile_id: result.profileId });
  } catch (err) {
    if (err instanceof ProfileServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusForCode(err.code) },
      );
    }
    console.error('[POST .../publish]', err);
    return NextResponse.json({ error: 'Publish failed unexpectedly.', code: 'server_error' }, { status: 500 });
  }
}
