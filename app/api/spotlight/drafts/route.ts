// app/api/spotlight/drafts/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/spotlight/drafts
//
// Creates a new draft submission in spotlight_submissions.
// Public endpoint — no authentication required.
// Rate-limited by middleware (30 req/min per IP).
//
// RETURNS: { submission_id, draft_token }
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

function generateDraftToken(): string {
  // 24 random bytes → 48 hex characters
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(req: NextRequest) {
  try {
    const draft_token = generateDraftToken();

    const db = createAdminClient();

    const { data, error } = await db
      .from('spotlight_submissions')
      .insert({
        status:           'draft',
        participant_name: '',    // populated as answers come in
        email:            '',    // populated when email question is answered
        metadata: {
          draft_token,
          draft_current_step:     0,
          draft_completed_steps:  [],
        },
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({
      submission_id: data.id,
      draft_token,
    });

  } catch (err) {
    console.error('[POST /api/spotlight/drafts]', err);
    return NextResponse.json(
      { error: 'Failed to create draft.' },
      { status: 500 },
    );
  }
}
