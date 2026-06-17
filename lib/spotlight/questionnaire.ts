// lib/spotlight/questionnaire.ts
// ─────────────────────────────────────────────────────────────────────────────
// Questionnaire service — the single source of truth for questionnaire logic.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  QuestionnaireConfig,
  QuestionnaireStep,
  SpotlightQuestion,
  SpotlightQuestionGroup,
  Answers,
  AnswerValue,
  ValidationErrors,
  ProgressSnapshot,
} from './types';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

// ── FETCH ──────────────────────────────────────────────────────────────────

/**
 * The actual data-fetching logic. Cached for 10 minutes. Single source
 * of truth — called by the API route (for browser/client consumers) AND
 * directly by Server Components (no HTTP, no NEXT_PUBLIC_APP_URL needed).
 */
export const getQuestionnaireData = unstable_cache(
  async (): Promise<QuestionnaireConfig> => {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const [groupsRes, questionsRes] = await Promise.all([
      db.from('spotlight_question_groups')
        .select('id, group_key, title, description, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      db.from('spotlight_questions')
        .select('id, group_id, question_key, question_text, help_text, placeholder, input_type, options, is_required, max_length, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ]);

    if (groupsRes.error)    throw new Error(groupsRes.error.message);
    if (questionsRes.error) throw new Error(questionsRes.error.message);

    const groups:    SpotlightQuestionGroup[] = groupsRes.data    ?? [];
    const questions: SpotlightQuestion[]      = questionsRes.data ?? [];

    const steps: QuestionnaireStep[] = groups.map((group, idx) => ({
      step_number: idx + 1,
      group,
      questions: questions
        .filter(q => q.group_id === group.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }));

    return { steps, total_steps: steps.length, total_questions: questions.length };
  },
  ['spotlight-questionnaire'],
  { tags: ['spotlight-questionnaire'], revalidate: 600 },
);

/** Used by Server Components — direct call, no self-fetch. */
export async function fetchQuestionnaire(): Promise<QuestionnaireConfig | null> {
  try {
    return await getQuestionnaireData();
  } catch (err) {
    console.error('[fetchQuestionnaire]', err);
    return null;
  }
}

// ── VALIDATION ────────────────────────────────────────────────────────────

/**
 * Validates all answers for a given step against the DB-defined rules.
 * Returns a map of question_key → error message.
 * An empty map means the step is valid.
 */
export function validateStep(
  questions: SpotlightQuestion[],
  answers: Answers,
): ValidationErrors {
  const errors: ValidationErrors = {};

  for (const q of questions) {
    const raw = answers[q.question_key];
    const error = validateAnswer(q, raw);
    if (error) errors[q.question_key] = error;
  }

  return errors;
}

/**
 * Validates a single answer against its question definition.
 * Returns an error string or null if valid.
 */
export function validateAnswer(
  question: SpotlightQuestion,
  value: AnswerValue | undefined,
): string | null {
  const isEmpty = isEmptyValue(value);

  // Required check
  if (question.is_required && isEmpty) {
    return 'This field is required.';
  }

  // Skip further checks if empty and not required
  if (isEmpty) return null;

  const str = Array.isArray(value) ? value.join(', ') : (value ?? '');

  // Max length check
  if (question.max_length && str.length > question.max_length) {
    return `Maximum ${question.max_length} characters. You have ${str.length}.`;
  }

  // Email format
  if (question.input_type === 'email' && !isValidEmail(str)) {
    return 'Please enter a valid email address.';
  }

  // URL format
  if (question.input_type === 'url' && str && !isValidUrl(str)) {
    return 'Please enter a valid URL (include https://).';
  }

  return null;
}

// ── PROGRESS ──────────────────────────────────────────────────────────────

/**
 * Calculates progress for the ProgressBar component.
 * currentStep is 0-based; display values are 1-based.
 * totalUiSteps = content steps + 1 review step.
 */
export function getProgress(
  currentStep: number,
  totalContentSteps: number,
  completedSteps: Set<number>,
): ProgressSnapshot {
  const totalSteps   = totalContentSteps + 1; // +1 for review
  const isReviewStep = currentStep >= totalContentSteps;
  const displayStep  = currentStep + 1;
  const percentage   = Math.round((displayStep / totalSteps) * 100);

  return {
    currentStep:    displayStep,
    totalSteps,
    percentage:     Math.min(percentage, 100),
    completedSteps: completedSteps.size,
    isReviewStep,
  };
}

// ── ANSWER UTILITIES ──────────────────────────────────────────────────────

/** Returns a display-friendly string for any answer value */
export function formatAnswerForReview(value: AnswerValue | undefined): string {
  if (!value) return '—';
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '—';
  }
  return value.trim() || '—';
}

/** Counts how many required questions in a step have been answered */
export function countAnsweredRequired(
  questions: SpotlightQuestion[],
  answers: Answers,
): { answered: number; total: number } {
  const required = questions.filter(q => q.is_required);
  const answered = required.filter(q => !isEmptyValue(answers[q.question_key]));
  return { answered: answered.length, total: required.length };
}

// ── PRIVATE HELPERS ───────────────────────────────────────────────────────

function isEmptyValue(value: AnswerValue | undefined): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return true;
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isValidUrl(s: string): boolean {
  try { new URL(s); return true; } catch { return false; }
}
