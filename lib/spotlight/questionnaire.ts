// lib/spotlight/questionnaire.ts
// ─────────────────────────────────────────────────────────────────────────────
// Questionnaire service — the single source of truth for questionnaire logic.
//
// RESPONSIBILITIES:
//   - Fetch questionnaire config from the API
//   - Transform DB rows into UI-friendly structure
//   - Validate a step's answers against DB-defined rules
//   - Calculate progress
//
// UI COMPONENTS MUST NOT:
//   - Transform DB data themselves
//   - Contain validation rules
//   - Know about question ordering logic
//
// All of that lives here.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  QuestionnaireConfig,
  QuestionnaireStep,
  SpotlightQuestion,
  Answers,
  AnswerValue,
  ValidationErrors,
  ProgressSnapshot,
} from './types';

// ── FETCH ──────────────────────────────────────────────────────────────────

/**
 * Fetches the questionnaire config from the API.
 * Used by Server Components (page.tsx) to pre-load config server-side.
 * Responses are cached at the API layer for 10 minutes.
 */
export async function fetchQuestionnaire(): Promise<QuestionnaireConfig | null> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res  = await fetch(`${base}/api/spotlight/questionnaire`, {
      next: { tags: ['spotlight-questionnaire'], revalidate: 600 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<QuestionnaireConfig>;
  } catch {
    return null;
  }
}

// ── VALIDATION ────────────────────────────────────────────────────────────

/**
 * Validates all answers for a given step against the DB-defined rules.
 * Returns a map of question_key → error message.
 * An empty map means the step is valid.
 *
 * Validation rules come from the question definition (is_required, max_length).
 * No rules are hardcoded here.
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
