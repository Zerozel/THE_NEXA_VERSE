// app/api/spotlight/agreements/[token]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/spotlight/agreements/[token]  — check acceptance status
// POST /api/spotlight/agreements/[token]  — record acceptance
//
// SECURITY:
//   Token validated the same way as Phase 3B drafts:
//   metadata->>'draft_token' = token AND status = 'draft'
//
//   This proves "ownership" of the draft (possession of the token,
//   stored in the participant's localStorage) without any login.
//
// STATUS GUARANTEE:
//   This route NEVER changes spotlight_submissions.status.
//   It only writes to spotlight_agreements and sets
//   spotlight_submissions.agreement_accepted_at (a timestamp, not a state).
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient }         from '@/lib/supabase-server';
import type { AcceptAgreementPayload } from '@/lib/spotlight/types';

type Params = { params: { token: string } };

function isValidToken(token: string): boolean {
  return /^[0-9a-f]{48}$/.test(token);
}

// ── Shared: find the draft submission by token ─────────────────────────────
async function findDraftByToken(token: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from('spotlight_submissions')
    .select('id, status')
    .eq('status', 'draft')
    .eq("metadata->>'draft_token'", token)
    .single();

  if (error || !data) return null;
  return data;
}

// ── GET — check agreement status ────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = params;
  if (!isValidToken(token)) {
    return NextResponse.json({ error: 'Invalid token.' }, { status: 400 });
  }

  const submission = await findDraftByToken(token);
  if (!submission) {
    return NextResponse.json({ error: 'Draft not found.' }, { status: 404 });
  }

  const db = createAdminClient();
  const { data: agreement } = await db
    .from('spotlight_agreements')
    .select('agreement_version, accepted_at')
    .eq('submission_id', submission.id)
    .maybeSingle();

  return NextResponse.json({
    accepted:          !!agreement,
    agreement_version: agreement?.agreement_version ?? null,
    accepted_at:       agreement?.accepted_at ?? null,
  });
}

// ── POST — record agreement acceptance ──────────────────────────────────────
export async function POST(req: NextRequest, { params }: Params) {
  const { token } = params;
  if (!isValidToken(token)) {
    return NextResponse.json({ error: 'Invalid token.' }, { status: 400 });
  }

  let body: AcceptAgreementPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const { agreement_version, agreement_text } = body;

  if (!agreement_version || !agreement_text || agreement_text.trim().length < 50) {
    return NextResponse.json(
      { error: 'agreement_version and agreement_text (full snapshot) are required.' },
      { status: 400 },
    );
  }

  // ── Validate draft ownership + status ─────────────────────────────────
  const submission = await findDraftByToken(token);
  if (!submission) {
    return NextResponse.json({ error: 'Draft not found.' }, { status: 404 });
  }

  const db = createAdminClient();

  // Capture request metadata for the legal record
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = req.headers.get('user-agent') ?? null;
  const acceptedAt = new Date().toISOString();

  // ── Upsert agreement row ───────────────────────────────────────────────
  // submission_id is UNIQUE — re-accepting (e.g. after editing answers
  // and returning to this screen) updates the existing row rather than
  // creating a duplicate. The snapshot is refreshed to the latest accepted
  // version/text and timestamp.
  const { error: agreementError } = await db
    .from('spotlight_agreements')
    .upsert({
      submission_id:          submission.id,
      agreement_version,
      agreement_text,
      accepted_at:            acceptedAt,
      participant_ip:         ip,
      participant_user_agent: userAgent,
    }, { onConflict: 'submission_id' });

  if (agreementError) {
    console.error('[POST /api/spotlight/agreements]', agreementError);
    return NextResponse.json({ error: 'Failed to record agreement.' }, { status: 500 });
  }

  // ── Denormalised flag on the submission ────────────────────────────────
  // Lets Phase 3D check "is this draft ready to submit?" with a single
  // column read instead of a join to spotlight_agreements.
  const { error: updateError } = await db
    .from('spotlight_submissions')
    .update({ agreement_accepted_at: acceptedAt })
    .eq('id', submission.id);

  if (updateError) {
    console.error('[POST /api/spotlight/agreements] submission update', updateError);
    // Agreement row was written successfully — this is non-fatal,
    // but log it. Phase 3D can fall back to checking spotlight_agreements directly.
  }

  return NextResponse.json({ ok: true, accepted_at: acceptedAt });
}
