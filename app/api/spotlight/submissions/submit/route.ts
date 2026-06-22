// app/api/spotlight/submissions/submit/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/spotlight/submissions/submit
//
// Converts a 'draft' submission into a 'submitted' submission.
//
// SECURITY:
//   Ownership proven by possession of draft_token (same model as
//   Phase 3B/3C). No login. Token format validated before any DB query.
//
// IDEMPOTENCY:
//   If the submission has already transitioned (status !== 'draft'),
//   this returns 409 'already_submitted' WITH the existing tracking_token
//   so the client can redirect to /spotlight/success anyway — handles
//   double-clicks and back-button resubmission gracefully.
//
// STATUS TRANSITION GUARANTEE:
//   The UPDATE includes .eq('status', 'draft') as a race-condition guard.
//   If two requests for the same draft arrive concurrently, only one
//   can win the update; the other receives 0 affected rows and is
//   treated as a failure (caller will retry, see the loop below — on
//   retry it will hit the 'already_submitted' branch instead).
//
// TRACKING EVENT GUARANTEE:
//   This route NEVER inserts into spotlight_tracking_events.
//   spotlight_on_submission_status_change() (Phase 2 trigger) does that
//   automatically the instant `status` changes. See Phase 2 schema.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient }         from '@/lib/supabase-server';
import { validateSubmissionReadiness } from '@/lib/spotlight/submissionValidation';
import type { SubmitDraftPayload, SubmitErrorResponse } from '@/lib/spotlight/types';

function isValidToken(token: string): boolean {
  return /^[0-9a-f]{48}$/.test(token);
}

/** sp_trk_ + 32 hex chars (16 random bytes) — visually distinct from draft tokens */
function generateTrackingToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `sp_trk_${hex}`;
}

function errorResponse(body: SubmitErrorResponse, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  // ── Parse + validate input ────────────────────────────────────────────
  let body: SubmitDraftPayload;
  try {
    body = await req.json();
  } catch {
    return errorResponse({ error: 'Invalid request body.', code: 'invalid_token' }, 400);
  }

  const { draft_token } = body;
  if (!draft_token || !isValidToken(draft_token)) {
    return errorResponse({ error: 'Invalid draft token.', code: 'invalid_token' }, 400);
  }

  const db = createAdminClient();

  // ── Find the submission (any status — needed to detect duplicates) ────
  const { data: submission, error: findError } = await db
    .from('spotlight_submissions')
    .select('id, status, tracking_token, metadata')
    .eq("metadata->>'draft_token'", draft_token)
    .maybeSingle();

  if (findError || !submission) {
    return errorResponse({ error: 'We could not find this application.', code: 'draft_not_found' }, 404);
  }

  // ── Idempotency: already submitted ─────────────────────────────────────
  if (submission.status !== 'draft') {
    return errorResponse({
      error: 'This Spotlight application has already been submitted.',
      code: 'already_submitted',
      tracking_token: submission.tracking_token ?? undefined,
    }, 409);
  }

  // ── Readiness validation ────────────────────────────────────────────────
  const readiness = await validateSubmissionReadiness(db, submission.id);
  if (!readiness.ready) {
    return errorResponse({
      error: 'Your application is missing required information.',
      code: 'not_ready',
      missing: readiness.missing,
    }, 422);
  }

  // ── Build cleaned metadata (drop draft-only fields) ─────────────────────
  const existingMeta = (submission.metadata as Record<string, unknown>) ?? {};
  const cleanedMeta  = { ...existingMeta };
  delete cleanedMeta.draft_token;
  delete cleanedMeta.draft_current_step;
  delete cleanedMeta.draft_completed_steps;

  // ── Transition: generate token, update, retry on (rare) collision ──────
  const submittedAt = new Date().toISOString();
  let result: { id: string; tracking_token: string; status: string } | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const trackingToken = generateTrackingToken();

    const { data, error } = await db
      .from('spotlight_submissions')
      .update({
        tracking_token: trackingToken,
        status:         'submitted',
        submitted_at:   submittedAt,
        metadata:       cleanedMeta,
      })
      .eq('id', submission.id)
      .eq('status', 'draft') // race-condition guard
      .select('id, tracking_token, status')
      .single();

    if (!error && data) { result = data; break; }

    // Unique violation on tracking_token (astronomically unlikely) — retry with a new token
    if (error?.code === '23505') continue;

    // Any other error (including the race-condition guard finding 0 rows) — stop retrying
    break;
  }

  if (!result) {
    return errorResponse({
      error: 'We could not complete your submission. Please try again.',
      code: 'submission_failed',
    }, 500);
  }

  // ── spotlight_on_submission_status_change() trigger fires here ─────────
  // It inserts a 'submitted' row into spotlight_tracking_events automatically.
  // No application code touches that table.

  return NextResponse.json({
    submission_id:  result.id,
    tracking_token: result.tracking_token,
    status:         result.status,
  });
}
