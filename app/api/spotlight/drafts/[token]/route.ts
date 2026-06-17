// app/api/spotlight/drafts/[token]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/spotlight/drafts/[token]  — load draft
// PATCH /api/spotlight/drafts/[token] — save progress
//
// Token validation: checks metadata->>'draft_token' = token AND status = 'draft'
// Never exposes submission_id in URLs — token is the only public identifier.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient }         from '@/lib/supabase-server';
import type { Answers, SaveDraftPayload } from '@/lib/spotlight/types';

type Params = { params: { token: string } };

// ── GET — load draft ───────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = params;
  if (!token || token.length !== 48) {
    return NextResponse.json({ error: 'Invalid token.' }, { status: 400 });
  }

  const db = createAdminClient();

  // Find the draft by token stored in metadata
  const { data: submission, error } = await db
    .from('spotlight_submissions')
    .select('id, email, participant_name, metadata')
    .eq('status', 'draft')
    .eq("metadata->>'draft_token'", token)
    .single();

  if (error || !submission) {
    return NextResponse.json({ error: 'Draft not found.' }, { status: 404 });
  }

  // Load saved responses
  const { data: responseRows } = await db
    .from('spotlight_responses')
    .select('question_key, response_text, response_meta')
    .eq('submission_id', submission.id);

  // Reconstruct answers map from stored responses
  const answers: Answers = {};
  for (const row of responseRows ?? []) {
    const meta = row.response_meta as Record<string, unknown>;
    // Array answers (multiselect, tags) are stored in response_meta.selected
    if (meta?.selected && Array.isArray(meta.selected)) {
      answers[row.question_key] = meta.selected as string[];
    } else {
      answers[row.question_key] = row.response_text ?? '';
    }
  }

  const meta = submission.metadata as Record<string, unknown>;

  return NextResponse.json({
    submission_id:    submission.id,
    draft_token:      token,
    email:            submission.email || null,
    participant_name: submission.participant_name || null,
    answers,
    current_step:    (meta?.draft_current_step as number)    ?? 0,
    completed_steps: (meta?.draft_completed_steps as number[]) ?? [],
  });
}

// ── PATCH — save progress ─────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const { token } = params;
  if (!token || token.length !== 48) {
    return NextResponse.json({ error: 'Invalid token.' }, { status: 400 });
  }

  let body: SaveDraftPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const { answers, current_step, completed_steps, email, participant_name } = body;

  const db = createAdminClient();

  // Verify the draft exists
  const { data: submission, error: findError } = await db
    .from('spotlight_submissions')
    .select('id, metadata')
    .eq('status', 'draft')
    .eq("metadata->>'draft_token'", token)
    .single();

  if (findError || !submission) {
    return NextResponse.json({ error: 'Draft not found.' }, { status: 404 });
  }

  const submissionId = submission.id;
  const existingMeta = (submission.metadata as Record<string, unknown>) ?? {};

  // ── 1. Update spotlight_submissions ─────────────────────────────────
  const submissionUpdate: Record<string, unknown> = {
    metadata: {
      ...existingMeta,
      draft_current_step:    current_step,
      draft_completed_steps: completed_steps,
    },
    updated_at: new Date().toISOString(),
  };

  // Update identity fields only when non-empty values are provided
  if (email && email.trim()) {
    submissionUpdate.email = email.trim().toLowerCase();
  }
  if (participant_name && participant_name.trim()) {
    submissionUpdate.participant_name = participant_name.trim();
  }

  const { error: updateError } = await db
    .from('spotlight_submissions')
    .update(submissionUpdate)
    .eq('id', submissionId);

  if (updateError) throw updateError;

  // ── 2. Upsert responses to spotlight_responses ───────────────────────
  // We need question_id (FK) for each answer.
  // Batch-load question IDs for all question_keys in this save payload.
  const questionKeys = Object.keys(answers);

  if (questionKeys.length > 0) {
    const { data: questions, error: qError } = await db
      .from('spotlight_questions')
      .select('id, question_key')
      .in('question_key', questionKeys);

    if (qError) throw qError;

    const keyToId = Object.fromEntries(
      (questions ?? []).map(q => [q.question_key, q.id])
    );

    // Build upsert rows — skip any question_key not found in DB
    const upsertRows = questionKeys
      .filter(key => keyToId[key])
      .map(key => {
        const value = answers[key];
        const isArray = Array.isArray(value);
        return {
          submission_id: submissionId,
          question_id:   keyToId[key],
          question_key:  key,
          response_text: isArray ? null : (value as string) || null,
          response_meta: isArray ? { selected: value } : {},
        };
      });

    if (upsertRows.length > 0) {
      const { error: upsertError } = await db
        .from('spotlight_responses')
        .upsert(upsertRows, { onConflict: 'submission_id,question_id' });

      if (upsertError) throw upsertError;
    }
  }

  return NextResponse.json({ ok: true });
}
