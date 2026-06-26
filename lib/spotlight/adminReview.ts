// lib/spotlight/adminReview.ts
// ─────────────────────────────────────────────────────────────────────────────
// SERVER-ONLY. Read-side data functions for the admin review system.
// Used directly by Server Component pages (dashboard, detail page) and by
// the queue API route (which needs interactivity — search/pagination —
// that a Server Component alone can't provide).
//
// All functions take a SupabaseClient (the service-role admin client from
// lib/supabase-server.ts) as their first argument rather than constructing
// their own — callers control which client is used, consistent with
// lib/spotlight/submissionValidation.ts from Phase 3D.
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AdminDashboardSummaryData,
  SubmissionQueueItem,
  SubmissionQueueResponse,
  SubmissionAnswerGroup,
  SubmissionDetail,
  SpotlightSubmissionStatus,
} from './types';

// ── DASHBOARD SUMMARY ────────────────────────────────────────────────────

export async function getAdminDashboardSummary(
  db: SupabaseClient,
): Promise<AdminDashboardSummaryData> {
  const [pending, flagged, approved, rejected] = await Promise.all([
    db.from('spotlight_submissions').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
    db.from('spotlight_submissions').select('id', { count: 'exact', head: true }).eq('status', 'flagged'),
    db.from('spotlight_submissions').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    db.from('spotlight_submissions').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
  ]);

  return {
    pending_count:  pending.count  ?? 0,
    flagged_count:  flagged.count  ?? 0,
    approved_count: approved.count ?? 0,
    rejected_count: rejected.count ?? 0,
  };
}

// ── CATEGORY / SKILLS LOOKUP (see architecture notes) ───────────────────
// Resolves 'category' and 'skills' for a batch of submissions by reading
// spotlight_responses directly — NOT the (currently unpopulated) dedicated
// columns on spotlight_submissions. Category's human label comes from the
// question's own `options` JSON, never duplicated in admin code.

type ProfileFacts = { category: string | null; skills: string[] };

async function fetchProfileFacts(
  db: SupabaseClient,
  submissionIds: string[],
): Promise<Record<string, ProfileFacts>> {
  const map: Record<string, ProfileFacts> = {};
  submissionIds.forEach(id => { map[id] = { category: null, skills: [] }; });
  if (submissionIds.length === 0) return map;

  const { data: relevantQuestions } = await db
    .from('spotlight_questions')
    .select('id, question_key, options')
    .in('question_key', ['category', 'skills']);

  const categoryQ = relevantQuestions?.find(q => q.question_key === 'category');
  const skillsQ   = relevantQuestions?.find(q => q.question_key === 'skills');
  const questionIds = [categoryQ?.id, skillsQ?.id].filter(Boolean) as string[];
  if (questionIds.length === 0) return map;

  const { data: responses } = await db
    .from('spotlight_responses')
    .select('submission_id, question_id, response_text, response_meta')
    .in('question_id', questionIds)
    .in('submission_id', submissionIds);

  const categoryLabels: Record<string, string> = {};
  ((categoryQ?.options as { value: string; label: string }[] | null) ?? []).forEach(o => {
    categoryLabels[o.value] = o.label;
  });

  (responses ?? []).forEach(r => {
    if (r.question_id === categoryQ?.id) {
      const raw = r.response_text ?? '';
      map[r.submission_id].category = categoryLabels[raw] ?? (raw || null);
    }
    if (r.question_id === skillsQ?.id) {
      const meta = r.response_meta as Record<string, unknown> | null;
      const selected = Array.isArray(meta?.selected) ? (meta!.selected as string[]) : [];
      map[r.submission_id].skills = selected;
    }
  });

  return map;
}

// ── REVIEW QUEUE ──────────────────────────────────────────────────────────
// Loads a bounded working set of 'submitted' applications (capped at 500,
// newest-first) and performs name/category search by filtering in memory.
//
// WHY NOT A SQL-LEVEL SEARCH: category isn't a real column (see above), so
// a single indexed query can't filter on it server-side without a Postgres
// function or RPC. Given the explicit "do not build advanced filtering yet"
// instruction, and that a campus review queue realistically holds dozens to
// low hundreds of pending items at once, loading a capped working set and
// filtering/paginating in application code is the simplest correct option.
// If volume grows well beyond a few hundred concurrent pending reviews,
// revisit with a Postgres function or a denormalised category column
// populated at submission time.
const WORKING_SET_CAP = 500;

export async function getSubmissionQueue(
  db: SupabaseClient,
  page: number,
  pageSize: number,
  search: string,
): Promise<SubmissionQueueResponse> {
  const { data: rows, error } = await db
    .from('spotlight_submissions')
    .select('id, participant_name, status, submitted_at, created_at')
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(WORKING_SET_CAP);

  if (error) throw error;

  const ids      = (rows ?? []).map(r => r.id);
  const factsMap = await fetchProfileFacts(db, ids);

  let items: SubmissionQueueItem[] = (rows ?? []).map(r => ({
    id:               r.id,
    participant_name: r.participant_name,
    category:         factsMap[r.id]?.category ?? null,
    status:           r.status as SpotlightSubmissionStatus,
    submitted_at:     r.submitted_at,
    created_at:       r.created_at,
  }));

  if (search) {
    const needle = search.toLowerCase();
    items = items.filter(i =>
      (i.participant_name ?? '').toLowerCase().includes(needle) ||
      (i.category ?? '').toLowerCase().includes(needle)
    );
  }

  const total = items.length;
  const from  = page * pageSize;
  const paged = items.slice(from, from + pageSize);

  return { items: paged, total, page, pageSize };
}

// ── ANSWER GROUPING ───────────────────────────────────────────────────────
// Builds the full read-only Q&A display, grouped by questionnaire section.
// Same response_meta.selected convention as Phase 3B/3D/3A's ReviewStep.

type RawGroup    = { id: string; title: string; sort_order: number };
type RawQuestion = { id: string; group_id: string | null; question_text: string; sort_order: number };
type RawResponse = { question_id: string; response_text: string | null; response_meta: unknown };

function buildAnswerGroups(
  groups: RawGroup[],
  questions: RawQuestion[],
  responses: RawResponse[],
): SubmissionAnswerGroup[] {
  const responseByQuestionId = new Map(responses.map(r => [r.question_id, r]));

  return [...groups]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(g => ({
      group_title: g.title,
      answers: questions
        .filter(q => q.group_id === g.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(q => {
          const r = responseByQuestionId.get(q.id);
          let answer = '\u2014';
          if (r) {
            const meta = r.response_meta as Record<string, unknown> | null;
            const selected = meta?.selected;
            if (Array.isArray(selected)) {
              answer = selected.length > 0 ? selected.join(', ') : '\u2014';
            } else {
              answer = r.response_text?.trim() || '\u2014';
            }
          }
          return { question_text: q.question_text, answer };
        }),
    }));
}

// ── REVIEWER EMAIL RESOLUTION ─────────────────────────────────────────────
// spotlight_review_logs only stores reviewer_id (a FK to auth.users).
// Resolves each unique id to an email via the service-role admin API
// rather than denormalising email onto the log table — keeps the audit
// schema untouched, per "do not create new tables / columns."

async function resolveReviewerEmails(
  db: SupabaseClient,
  reviewerIds: string[],
): Promise<Record<string, string>> {
  const uniqueIds = Array.from(new Set(reviewerIds.filter(Boolean)));
  const map: Record<string, string> = {};

  for (const id of uniqueIds) {
    try {
      const { data } = await db.auth.admin.getUserById(id);
      if (data?.user?.email) map[id] = data.user.email;
    } catch {
      // Reviewer account may have been deleted — fall back gracefully below.
    }
  }

  return map;
}

// ── SUBMISSION DETAIL ─────────────────────────────────────────────────────

export async function getSubmissionDetail(
  db: SupabaseClient,
  id: string,
): Promise<SubmissionDetail | null> {
  const { data: submission, error } = await db
    .from('spotlight_submissions')
    .select('id, status, participant_name, email, category, skills, submitted_at, agreement_accepted_at, rejection_reason')
    .eq('id', id)
    .maybeSingle();

  if (error || !submission || submission.status === 'draft') return null;

  const [{ data: agreement }, { data: groups }, { data: questions }, { data: responses }] = await Promise.all([
    db.from('spotlight_agreements').select('agreement_version, accepted_at').eq('submission_id', id).maybeSingle(),
    db.from('spotlight_question_groups').select('id, title, sort_order').order('sort_order', { ascending: true }),
    db.from('spotlight_questions').select('id, group_id, question_text, sort_order').order('sort_order', { ascending: true }),
    db.from('spotlight_responses').select('question_id, response_text, response_meta').eq('submission_id', id),
  ]);

  const factsMap = await fetchProfileFacts(db, [id]);
  const facts    = factsMap[id] ?? { category: null, skills: [] };

  const { data: events } = await db
    .from('spotlight_tracking_events')
    .select('event_label, event_description, created_at, is_public')
    .eq('submission_id', id)
    .order('created_at', { ascending: true });

  const { data: logs } = await db
    .from('spotlight_review_logs')
    .select('id, action, reviewer_id, note, created_at')
    .eq('submission_id', id)
    .order('created_at', { ascending: false });

  const reviewerIds = (logs ?? []).map(l => l.reviewer_id);
  const emailMap     = await resolveReviewerEmails(db, reviewerIds);

  return {
    id: submission.id,
    status: submission.status as SpotlightSubmissionStatus,
    participant_name: submission.participant_name,
    email: submission.email,
    category: facts.category ?? submission.category ?? null,
    skills: facts.skills.length > 0 ? facts.skills : (submission.skills ?? []),
    submitted_at: submission.submitted_at,
    agreement_accepted_at: submission.agreement_accepted_at,
    agreement_version: agreement?.agreement_version ?? null,
    rejection_reason: submission.rejection_reason,
    groups: buildAnswerGroups(groups ?? [], questions ?? [], responses ?? []),
    timeline_events: events ?? [],
    review_logs: (logs ?? []).map(l => ({
      id: l.id,
      action: l.action,
      reviewer_email: emailMap[l.reviewer_id] ?? 'Unknown',
      note: l.note,
      created_at: l.created_at,
    })),
  };
}
