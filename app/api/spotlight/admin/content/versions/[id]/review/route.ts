// app/api/spotlight/admin/content/versions/[id]/review/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/spotlight/admin/content/versions/[id]/review
// Records a review decision (approved / rejected / needs_revision) for
// a specific content version. Admin-only. Mandatory review note.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient }         from '@/lib/supabase-server';
import {
  getAuthenticatedAdmin,
  adminErrorResponse,
} from '@/lib/spotlight/adminAuth';
import {
  reviewContentVersion,
  ContentReviewError,
} from '@/lib/spotlight/contentReview';
import type { ReviewAction } from '@/lib/spotlight/types';

export const dynamic = 'force-dynamic';

const VALID_ACTIONS: ReviewAction[] = ['approved', 'rejected', 'needs_revision'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function httpStatusForCode(code: string): number {
  if (code === 'missing_version' || code === 'missing_content_item') return 404;
  if (code === 'missing_note' || code === 'note_too_short')           return 400;
  if (code === 'already_approved')                                     return 409;
  return 500;
}

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  // Auth — returns reviewer identity for the audit log
  let reviewer: { id: string; email: string };
  try {
    reviewer = await getAuthenticatedAdmin();
  } catch (err) {
    return adminErrorResponse(err);
  }

  const { id } = params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid version id.', code: 'invalid_input' }, { status: 400 });
  }

  let body: { action?: unknown; review_note?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.', code: 'invalid_input' }, { status: 400 });
  }

  const { action, review_note } = body;

  if (!action || !VALID_ACTIONS.includes(action as ReviewAction)) {
    return NextResponse.json(
      { error: `action must be one of: ${VALID_ACTIONS.join(', ')}`, code: 'invalid_action' },
      { status: 400 },
    );
  }

  if (!review_note || typeof review_note !== 'string' || review_note.trim().length === 0) {
    return NextResponse.json(
      { error: 'review_note is required and must be a non-empty string.', code: 'missing_note' },
      { status: 400 },
    );
  }

  const db = createAdminClient();

  try {
    const result = await reviewContentVersion(
      db,
      id,
      action as ReviewAction,
      review_note,
      reviewer.id,
      reviewer.email,
    );
    return NextResponse.json({ ok: true, log_id: result.log_id });
  } catch (err) {
    if (err instanceof ContentReviewError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: httpStatusForCode(err.code) },
      );
    }
    console.error('[POST .../versions/[id]/review]', err);
    return NextResponse.json(
      { error: 'Review action failed unexpectedly.', code: 'server_error' },
      { status: 500 },
    );
  }
}
