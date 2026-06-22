// lib/spotlight/submissionValidation.ts
// ─────────────────────────────────────────────────────────────────────────────
// SERVER-ONLY. Imported only by app/api/spotlight/submissions/submit/route.ts.
//
// Validates that a draft submission has everything required before it can
// transition to 'submitted'. Returns a list of human-readable missing items
// so the participant can fix exactly what's wrong — never a generic
// "something went wrong".
//
// CHECKS PERFORMED:
//   1. Email address is present and non-empty
//   2. Agreement has been accepted (agreement_accepted_at is set — Phase 3C)
//   3. Every active, required question has a non-empty response
//
// WHAT THIS DOES NOT CHECK (intentionally):
//   - Draft token validity        → caller's responsibility (route-level)
//   - Submission status = 'draft' → caller's responsibility (route-level)
//   - Duplicate submissions        → caller's responsibility (route-level)
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReadinessCheck } from './types';

export async function validateSubmissionReadiness(
  db: SupabaseClient,
  submissionId: string,
): Promise<ReadinessCheck> {
  const missing: string[] = [];

  // ── 1. Core submission fields ─────────────────────────────────────────
  const { data: submission, error: subError } = await db
    .from('spotlight_submissions')
    .select('email, agreement_accepted_at')
    .eq('id', submissionId)
    .single();

  if (subError || !submission) {
    return { ready: false, missing: ['Submission record could not be found.'] };
  }

  if (!submission.email || submission.email.trim() === '') {
    missing.push('An email address is required.');
  }

  if (!submission.agreement_accepted_at) {
    missing.push('The Spotlight Participation Agreement has not been accepted.');
  }

  // ── 2. Required questions vs. answered responses ───────────────────────
  const { data: requiredQuestions } = await db
    .from('spotlight_questions')
    .select('id, question_text')
    .eq('is_active', true)
    .eq('is_required', true);

  const { data: responses } = await db
    .from('spotlight_responses')
    .select('question_id, response_text, response_meta')
    .eq('submission_id', submissionId);

  // A question counts as "answered" if it has non-empty text,
  // OR a non-empty selected[] array (multiselect / tags).
  const answeredQuestionIds = new Set(
    (responses ?? [])
      .filter(r => {
        const meta = r.response_meta as Record<string, unknown> | null;
        const selected = meta?.selected;
        if (Array.isArray(selected)) return selected.length > 0;
        return !!(r.response_text && r.response_text.trim() !== '');
      })
      .map(r => r.question_id)
  );

  for (const q of requiredQuestions ?? []) {
    if (!answeredQuestionIds.has(q.id)) {
      missing.push(`"${q.question_text}" is required but was not answered.`);
    }
  }

  return { ready: missing.length === 0, missing };
}
