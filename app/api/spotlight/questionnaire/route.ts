// app/api/spotlight/questionnaire/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Public endpoint. No authentication required.
// Returns the full questionnaire structure: groups + questions, ordered and
// shaped for direct rendering by the UI.
//
// CACHING:
//   Questions and groups change rarely (admin-managed content).
//   Response is cached for 10 minutes via Next.js unstable_cache + CDN headers.
//   Cache purges via revalidateTag('spotlight-questionnaire') when admin
//   changes questions (Phase 4 admin UI will call this).
//
// RESPONSE SHAPE:
//   QuestionnaireConfig (see lib/spotlight/types.ts)
//   Steps are sorted by group.sort_order.
//   Questions within each step are sorted by question.sort_order.
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse }    from 'next/server';
import { unstable_cache }  from 'next/cache';
import { createClient }    from '@supabase/supabase-js';
import type {
  QuestionnaireConfig,
  QuestionnaireStep,
  SpotlightQuestion,
  SpotlightQuestionGroup,
} from '@/lib/spotlight/types';

// ── CACHED FETCHER ────────────────────────────────────────────────────────
// Runs server-side once per cache window.
// Supabase anon key is safe here — RLS allows public SELECT on these tables.
const fetchQuestionnaireData = unstable_cache(
  async (): Promise<QuestionnaireConfig> => {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const [groupsRes, questionsRes] = await Promise.all([
      db
        .from('spotlight_question_groups')
        .select('id, group_key, title, description, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),

      db
        .from('spotlight_questions')
        .select('id, group_id, question_key, question_text, help_text, placeholder, input_type, options, is_required, max_length, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ]);

    if (groupsRes.error)    throw new Error(groupsRes.error.message);
    if (questionsRes.error) throw new Error(questionsRes.error.message);

    const groups:    SpotlightQuestionGroup[] = groupsRes.data    ?? [];
    const questions: SpotlightQuestion[]      = questionsRes.data ?? [];

    // Build steps: one per group, questions assigned by group_id
    const steps: QuestionnaireStep[] = groups.map((group, idx) => ({
      step_number: idx + 1,
      group,
      questions: questions
        .filter(q => q.group_id === group.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }));

    return {
      steps,
      total_steps:     steps.length,
      total_questions: questions.length,
    };
  },
  ['spotlight-questionnaire'],
  { tags: ['spotlight-questionnaire'], revalidate: 600 }, // 10 minutes
);

// ── ROUTE HANDLER ─────────────────────────────────────────────────────────
export async function GET() {
  try {
    const config = await fetchQuestionnaireData();

    return NextResponse.json(config, {
      headers: {
        // Allow browsers and CDN to cache for 5 minutes
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error('[/api/spotlight/questionnaire]', err);
    return NextResponse.json(
      { error: 'Failed to load questionnaire configuration.' },
      { status: 500 },
    );
  }
}
