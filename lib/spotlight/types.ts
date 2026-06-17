// lib/spotlight/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all Spotlight TypeScript types.
// Mirrors the database schema defined in 002_spotlight_schema.sql.
// UI-layer types (state, validation) live alongside DB-mirror types.
// ─────────────────────────────────────────────────────────────────────────────

// ── DATABASE-MIRROR TYPES ─────────────────────────────────────────────────

export type QuestionInputType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'url'
  | 'select'
  | 'multiselect'
  | 'tags';

export type SelectOption = {
  value: string;
  label: string;
};

/** Mirrors spotlight_questions row */
export type SpotlightQuestion = {
  id: string;
  group_id: string | null;
  question_key: string;
  question_text: string;
  help_text: string | null;
  placeholder: string | null;
  input_type: QuestionInputType;
  options: SelectOption[] | null;
  is_required: boolean;
  max_length: number | null;
  sort_order: number;
};

/** Mirrors spotlight_question_groups row */
export type SpotlightQuestionGroup = {
  id: string;
  group_key: string;
  title: string;
  description: string | null;
  sort_order: number;
};

// ── QUESTIONNAIRE STRUCTURE TYPES ─────────────────────────────────────────

/**
 * One step in the questionnaire UI.
 * Maps to one spotlight_question_groups row + its questions.
 * step_number is 1-based.
 */
export type QuestionnaireStep = {
  step_number: number;
  group: SpotlightQuestionGroup;
  questions: SpotlightQuestion[];
};

/**
 * The full questionnaire config returned by the API.
 * This is what the UI renders from — no further DB calls needed.
 */
export type QuestionnaireConfig = {
  steps: QuestionnaireStep[];
  total_steps: number;      // content steps (excludes the synthetic review step)
  total_questions: number;
};

// ── UI STATE TYPES ────────────────────────────────────────────────────────

/** An answer is either a plain string or an array of strings (multi-select, tags) */
export type AnswerValue = string | string[];

/** All current answers, keyed by question_key */
export type Answers = Record<string, AnswerValue>;

/** Per-question validation error messages, keyed by question_key */
export type ValidationErrors = Record<string, string>;

/**
 * The complete client-side questionnaire state.
 * Lives in a single useState — no external store, no persistence.
 */
export type QuestionnaireState = {
  answers: Answers;
  currentStep: number;         // 0-based index into QuestionnaireConfig.steps
  errors: ValidationErrors;
  completedSteps: Set<number>; // which 0-based step indexes have passed validation
  isTransitioning: boolean;    // true during step animation
};

/** Progress snapshot for the ProgressBar component */
export type ProgressSnapshot = {
  currentStep: number;    // 1-based for display
  totalSteps: number;     // total steps including review step
  percentage: number;     // 0–100
  completedSteps: number; // count of validated steps
  isReviewStep: boolean;
};
