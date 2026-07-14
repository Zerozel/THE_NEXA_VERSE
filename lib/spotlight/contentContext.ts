// lib/spotlight/contentContext.ts
// ─────────────────────────────────────────────────────────────────────────────
// SERVER-ONLY. Loads everything a prompt builder needs and shapes it into
// a GenerationContext. Prompt builders never query the database — this
// file is the only place that happens, so adding a 7th content type later
// never means teaching a prompt file how to read Supabase.
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchProfileFacts } from './adminReview'; // exported since Phase 5A — reused, not reimplemented
import type { GenerationContext } from './types';

export class ContentContextError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Maps known question_keys onto named GenerationContext fields. Anything
 * NOT listed here still lands in rawResponses — so a future prompt can
 * always reach a questionnaire answer without a code change here.
 */
const FIELD_MAP: Record<string, keyof GenerationContext> = {
  full_name:                 'participantName',
  display_name:               'displayName',
  your_role:                    'role',
  location:                       'location',
  background_story:                 'backgroundStory',
  origin_story:                      'originStory',
  biggest_challenge:                    'biggestChallenge',
  proudest_moment:                        'proudestMoment',
  business_name:                            'businessName',
  what_you_do:                                'whatYouDo',
  what_makes_you_different:                      'whatMakesYouDifferent',
  who_you_help:                                     'whoYouHelp',
  your_vision:                                         'yourVision',
  your_motivation:                                        'yourMotivation',
  what_you_need:                                            'whatYouNeed',
  message_to_community:                                        'messageToCommunity',
  collaboration_open:                                              'collaborationOpen',
  one_thing_remembered:                                                'oneThingRemembered',
};

export async function buildGenerationContext(
  db: SupabaseClient,
  submissionId: string,
): Promise<GenerationContext> {
  const { data: submission, error: subError } = await db
    .from('spotlight_submissions')
    .select('id, participant_name')
    .eq('id', submissionId)
    .maybeSingle();

  if (subError) throw new ContentContextError('Database error while loading the submission.', 'server_error');
  if (!submission) throw new ContentContextError('Submission not found.', 'missing_submission');

  const { data: responses, error: respError } = await db
    .from('spotlight_responses')
    .select('question_key, response_text, response_meta')
    .eq('submission_id', submissionId);

  if (respError) throw new ContentContextError('Database error while loading responses.', 'server_error');

  // Reuses the exact same category/skills resolution Phase 4's queue and
  // Phase 5A's content queue already depend on — no third implementation.
  const factsMap = await fetchProfileFacts(db, [submissionId]);
  const facts     = factsMap[submissionId] ?? { category: null, skills: [] };

  const rawResponses: Record<string, string> = {};
  const context: GenerationContext = {
    participantName: submission.participant_name ?? null,
    displayName: null,
    role: null,
    location: null,
    category: facts.category,
    skills: facts.skills,
    backgroundStory: null,
    originStory: null,
    biggestChallenge: null,
    proudestMoment: null,
    businessName: null,
    whatYouDo: null,
    whatMakesYouDifferent: null,
    whoYouHelp: null,
    yourVision: null,
    yourMotivation: null,
    whatYouNeed: null,
    messageToCommunity: null,
    collaborationOpen: null,
    oneThingRemembered: null,
    rawResponses,
  };

  for (const r of responses ?? []) {
    const meta  = r.response_meta as { selected?: string[] } | null;
    const value = Array.isArray(meta?.selected) ? meta!.selected!.join(', ') : (r.response_text ?? '');

    rawResponses[r.question_key] = value;

    const field = FIELD_MAP[r.question_key];
    if (field && value) {
      // Live response data is treated as authoritative — if it ever
      // differs from a denormalized column (e.g. participant_name), the
      // freshest answer wins.
      (context as unknown as Record<string, string>)[field] = value;
    }
  }

  return context;
}
