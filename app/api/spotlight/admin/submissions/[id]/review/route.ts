// app/api/spotlight/admin/submissions/[id]/review/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/spotlight/admin/submissions/[id]/review
// Body: { action: 'approved' | 'rejected' | 'flagged', note: string }
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { requireSpotlightAdmin, adminErrorResponse } from '@/lib/spotlight/adminAuth';
import { createContentAssetsForSubmission } from '@/lib/spotlight/content';
import type { ReviewActionPayload, ReviewErrorResponse } from '@/lib/spotlight/types';

type Params = { params: { id: string } };

const VALID_ACTIONS: string[] = ['approved', 'rejected', 'flagged'];

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function errorResponse(body: ReviewErrorResponse, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest, { params }: Params) {
  let admin;
  try {
    admin = await requireSpotlightAdmin();
  } catch (err) {
    return adminErrorResponse(err);
  }

  const { id } = params;
  if (!isValidUuid(id)) {
    return errorResponse({ error: 'Invalid submission id.', code: 'invalid_input' }, 400);
  }

  let body: ReviewActionPayload;
  try {
    body = await req.json();
  } catch {
    return errorResponse({ error: 'Invalid request body.', code: 'invalid_input' }, 400);
  }

  const { action, note } = body;

  if (!VALID_ACTIONS.includes(action)) {
    return errorResponse({ error: 'Invalid review action.', code: 'invalid_input' }, 400);
  }
  if (!note || note.trim().length < 5) {
    return errorResponse(
      { error: 'A review note of at least 5 characters is required.', code: 'invalid_input' },
      400,
    );
  }

  const db = createAdminClient();

  const { data: submission, error: findError } = await db
    .from('spotlight_submissions')
    .select('id, status')
    .eq('id', id)
    .maybeSingle();

  if (findError) {
    console.error('[POST .../review] lookup error', findError);
    return errorResponse({ error: 'Database error.', code: 'server_error' }, 500);
  }
  if (!submission) {
    return errorResponse({ error: 'Submission not found.', code: 'not_found' }, 404);
  }

  if (submission.status !== 'submitted') {
    return errorResponse({
      error: `This submission is already "${submission.status}" and cannot be reviewed again.`,
      code: 'invalid_transition',
    }, 409);
  }

  const trimmedNote = note.trim();
  const now = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    status: action,
    reviewer_id: admin.id,
    review_note: trimmedNote,
    reviewed_at: now,
    updated_at: now,
  };
  if (action === 'approved') updatePayload.approved_at = now;
  if (action === 'rejected') updatePayload.rejection_reason = trimmedNote;

  const { data: updated, error: updateError } = await db
    .from('spotlight_submissions')
    .update(updatePayload)
    .eq('id', id)
    .eq('status', 'submitted')
    .select('status')
    .single();

  if (updateError || !updated) {
    return errorResponse({
      error: 'Could not update this submission — it may have just been actioned by someone else.',
      code: 'invalid_transition',
    }, 409);
  }

  // ─── NEW: Create content assets if approved ──────────────────────
  if (action === 'approved') {
    try {
      console.log(`[review] Creating content assets for submission ${id}`);
      await createContentAssetsForSubmission(db, id);
      console.log(`[review] Content assets created successfully`);
    } catch (contentError) {
      console.error('[review] Failed to create content assets:', contentError);
      // We don't fail the approval if content creation fails, but we log it
      // The admin can retry from the content queue if needed
    }
  }

  const { error: logError } = await db.from('spotlight_review_logs').insert({
    submission_id: id,
    reviewer_id: admin.id,
    action,
    note: trimmedNote,
    metadata: { previous_status: 'submitted' },
  });

  if (logError) {
    console.error('[POST .../review] review_logs insert failed', logError);
  }

  return NextResponse.json({ ok: true, status: updated.status });
}
