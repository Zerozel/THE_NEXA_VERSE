// lib/spotlight/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// All Spotlight TypeScript types.
// Updated in Phase 3B: added draft persistence types.
// ─────────────────────────────────────────────────────────────────────────────

// ── DATABASE-MIRROR TYPES ─────────────────────────────────────────────────

export type QuestionInputType =
  | 'text' | 'textarea' | 'email' | 'phone' | 'url'
  | 'select' | 'multiselect' | 'tags';

export type SelectOption = { value: string; label: string; };

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

export type SpotlightQuestionGroup = {
  id: string;
  group_key: string;
  title: string;
  description: string | null;
  sort_order: number;
};

// ── QUESTIONNAIRE STRUCTURE ───────────────────────────────────────────────

export type QuestionnaireStep = {
  step_number: number;
  group: SpotlightQuestionGroup;
  questions: SpotlightQuestion[];
};

export type QuestionnaireConfig = {
  steps: QuestionnaireStep[];
  total_steps: number;
  total_questions: number;
};

// ── UI STATE ──────────────────────────────────────────────────────────────

export type AnswerValue = string | string[];
export type Answers = Record<string, AnswerValue>;
export type ValidationErrors = Record<string, string>;

export type QuestionnaireState = {
  answers: Answers;
  currentStep: number;
  errors: ValidationErrors;
  completedSteps: Set<number>;
  isTransitioning: boolean;
};

export type ProgressSnapshot = {
  currentStep: number;
  totalSteps: number;
  percentage: number;
  completedSteps: number;
  isReviewStep: boolean;
};

// ── PHASE 3B: DRAFT PERSISTENCE TYPES ────────────────────────────────────

/**
 * The full draft record returned by GET /api/spotlight/drafts/[token].
 * Contains everything needed to restore the questionnaire state.
 */
export type DraftData = {
  submission_id: string;
  draft_token: string;
  email: string | null;
  participant_name: string | null;
  answers: Answers;            // keyed by question_key
  current_step: number;        // 0-based
  completed_steps: number[];   // 0-based step indexes
};

/**
 * Payload sent to PATCH /api/spotlight/drafts/[token].
 * Contains the current state to persist.
 */
export type SaveDraftPayload = {
  answers: Answers;
  current_step: number;
  completed_steps: number[];
  email?: string;              // extracted when email_address question is answered
  participant_name?: string;   // extracted when full_name question is answered
};

/**
 * Auto-save indicator states shown in the UI.
 */
export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Response from POST /api/spotlight/drafts
 */
export type CreateDraftResponse = {
  submission_id: string;
  draft_token: string;
};
