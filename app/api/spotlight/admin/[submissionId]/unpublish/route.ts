// app/api/spotlight/admin/profiles/[submissionId]/unpublish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient }         from '@/lib/supabase-server';
import { getAuthenticatedAdmin, adminErrorResponse } from '@/lib/spotlight/adminAuth';
import { unpublishProfile, ProfileServiceError } from '@/lib/spotlight/profiles';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: { submissionId: string } };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    await getAuthenticatedAdmin();
  } catch (err) {
    return adminErrorResponse(err);
  }

  const { submissionId } = params;
  if (!UUID_RE.test(submissionId)) {
    return NextResponse.json({ error: 'Invalid submission id.', code: 'invalid_input' }, { status: 400 });
  }

  const db = createAdminClient();

  try {
    await unpublishProfile(db, submissionId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ProfileServiceError) {
      const status = err.code === 'missing_profile' ? 404 : err.code === 'already_unpublished' ? 409 : 500;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error('[POST .../unpublish]', err);
    return NextResponse.json({ error: 'Unpublish failed.', code: 'server_error' }, { status: 500 });
  }
}
