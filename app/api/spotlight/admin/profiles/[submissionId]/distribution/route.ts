// app/api/spotlight/admin/profiles/[submissionId]/distribution/route.ts
// GET  — returns the current distribution log for a profile
// POST — marks or unmarks a channel as distributed
import { NextRequest, NextResponse }  from 'next/server';
import { createAdminClient }          from '@/lib/supabase-server';
import { getAuthenticatedAdmin, adminErrorResponse } from '@/lib/spotlight/adminAuth';
import {
  getDistributionLog,
  markChannelDistributed,
  unmarkChannelDistributed,
  DistributionServiceError,
} from '@/lib/spotlight/distribution';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: { submissionId: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try { await getAuthenticatedAdmin(); } catch (err) { return adminErrorResponse(err); }

  const db = createAdminClient();

  // Resolve profile_id from submission_id
  const { data: profile } = await db
    .from('spotlight_profiles')
    .select('id')
    .eq('submission_id', params.submissionId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found.', code: 'missing_profile' }, { status: 404 });
  }

  try {
    const log = await getDistributionLog(db, profile.id);
    return NextResponse.json({ ok: true, log });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load distribution log.', code: 'server_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  let admin: { id: string; email: string };
  try { admin = await getAuthenticatedAdmin(); } catch (err) { return adminErrorResponse(err); }

  let body: { action?: unknown; channel_id?: unknown; channel_name?: unknown; log_id?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body.', code: 'invalid_input' }, { status: 400 });
  }

  const { action, channel_id, channel_name, log_id } = body;

  if (action !== 'mark' && action !== 'unmark') {
    return NextResponse.json({ error: 'action must be "mark" or "unmark".', code: 'invalid_action' }, { status: 400 });
  }

  const db = createAdminClient();

  try {
    if (action === 'mark') {
      if (!channel_id || typeof channel_id !== 'string' || !UUID_RE.test(channel_id)) {
        return NextResponse.json({ error: 'Valid channel_id is required for mark.', code: 'invalid_input' }, { status: 400 });
      }
      if (!channel_name || typeof channel_name !== 'string') {
        return NextResponse.json({ error: 'channel_name is required for mark.', code: 'invalid_input' }, { status: 400 });
      }

      // Resolve profile_id
      const { data: profile } = await db
        .from('spotlight_profiles')
        .select('id')
        .eq('submission_id', params.submissionId)
        .maybeSingle();

      if (!profile) {
        return NextResponse.json({ error: 'Profile not found.', code: 'missing_profile' }, { status: 404 });
      }

      const result = await markChannelDistributed(db, profile.id, channel_id, channel_name, admin.id, admin.email);
      return NextResponse.json({ ok: true, log_id: result.log_id });
    }

    if (action === 'unmark') {
      if (!log_id || typeof log_id !== 'string' || !UUID_RE.test(log_id)) {
        return NextResponse.json({ error: 'Valid log_id is required for unmark.', code: 'invalid_input' }, { status: 400 });
      }
      await unmarkChannelDistributed(db, log_id);
      return NextResponse.json({ ok: true });
    }
  } catch (err) {
    if (err instanceof DistributionServiceError) {
      const status = err.code === 'missing_profile' ? 404
        : err.code === 'profile_not_published' ? 422
        : 500;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error('[POST .../distribution]', err);
    return NextResponse.json({ error: 'Distribution action failed.', code: 'server_error' }, { status: 500 });
  }
}
