// lib/spotlight/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// All Spotlight TypeScript types.
// Updated in Phase 3B: added draft persistence types.
// Updated in Phase 3C: added agreement and flow phase types.
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

// ── PHASE 3C: AGREEMENT TYPES ────────────────────────────────────────────

/**
 * Current agreement status for a draft.
 * Returned by GET /api/spotlight/agreements/[token]
 */
export type AgreementStatus = {
  accepted: boolean;
  agreement_version: string | null;
  accepted_at: string | null;
};

/**
 * Payload sent to POST /api/spotlight/agreements/[token]
 */
export type AcceptAgreementPayload = {
  agreement_version: string;
  agreement_text: string; // full snapshot, joined from AGREEMENT_POINTS
};

/**
 * Response from POST /api/spotlight/agreements/[token]
 */
export type AcceptAgreementResponse = {
  ok: true;
  accepted_at: string;
};



// ── PHASE 3D: SUBMISSION TYPES ───────────────────────────────────────────

/**
 * Result of the readiness check performed before submission.
 * missing[] contains human-readable descriptions of what's incomplete —
 * shown directly to the participant if submission is blocked.
 */
export type ReadinessCheck = {
  ready: boolean;
  missing: string[];
};

/** Payload sent to POST /api/spotlight/submissions/submit */
export type SubmitDraftPayload = {
  draft_token: string;
};

/** Successful submission response */
export type SubmitDraftResponse = {
  submission_id: string;
  tracking_token: string;
  status: 'submitted';
};

/** Error codes returned by the submit endpoint */
export type SubmitErrorCode =
  | 'invalid_token'
  | 'draft_not_found'
  | 'already_submitted'
  | 'not_ready'
  | 'submission_failed';

/** Error response shape from the submit endpoint */
export type SubmitErrorResponse = {
  error: string;
  code: SubmitErrorCode;
  missing?: string[];        // present when code = 'not_ready'
  tracking_token?: string;   // present when code = 'already_submitted'
};

/**
 * FlowPhase extended for Phase 3D.
 * 'complete' from Phase 3C is replaced by 'submitting' (transient) —
 * success now redirects to /spotlight/success rather than rendering inline.
 */
/**
 * The questionnaire flow now has phases beyond raw step index.
 * Used by QuestionnaireFlow to decide what to render. 
 */
 
// ── PHASE 3E: TRACKING TYPES ──────────────────────────────────────────────

/**
 * The full set of statuses a submission can hold, per the Phase 2
 * CHECK constraint on spotlight_submissions.status.
 */
export type SpotlightSubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'flagged'
  | 'queued'
  | 'published';

export type TimelineEventState = 'completed' | 'current' | 'upcoming';

/**
 * One row in the participant-facing timeline.
 * 'completed' and 'current' steps come from real spotlight_tracking_events
 * rows. 'upcoming' steps are computed from the known happy-path order and
 * carry no timestamp (the event hasn't happened yet).
 */
export type TrackingTimelineEvent = {
  status: SpotlightSubmissionStatus;
  label: string;
  description: string | null;
  timestamp: string | null;
  state: TimelineEventState;
};

export type StatusTone = 'info' | 'success' | 'warning' | 'muted';

/**
 * Forward-looking status explanation — distinct from the frozen
 * event_label/event_description stored per-event. See architecture notes.
 */
export type StatusMessageConfig = {
  status: SpotlightSubmissionStatus;
  label: string;
  message: string;
  icon: string;
  tone: StatusTone;
};

/** Full payload returned by GET /api/spotlight/track/[trackingToken] */
export type TrackingInfo = {
  current_status: SpotlightSubmissionStatus;
  submitted_at: string | null;
  timeline_events: TrackingTimelineEvent[];
  current_stage: StatusMessageConfig;
  next_stage: StatusMessageConfig | null;
};

export type TrackingErrorCode = 'invalid_token' | 'not_found' | 'server_error';

export type TrackingErrorResponse = {
  error: string;
  code: TrackingErrorCode;
};



// ── PHASE 5A: CONTENT FOUNDATION TYPES ───────────────────────────────────

export type ContentQueueItem = {
  id: string;
  submission_id: string;
  participant_name: string | null;
  category: string | null;
  submitted_at: string | null;
  content_type: string;
  content_status: string;
  created_at: string;
  generation_count: number;          // current_version ?? 0
  last_generated_at: string | null;  // updated_at when status='generated', else null

};

export type ContentQueueResponse = {
  items: ContentQueueItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ContentItemDetail = {
  id: string;
  submission_id: string;
  participant_name: string | null;
  category: string | null;
  submission_status: SpotlightSubmissionStatus | null;
  submitted_at: string | null;
  content_type: string;
  content_status: string;
  created_at: string;
  updated_at: string;
  has_versions: boolean;
  version_count: number;
};

export type ContentMetricsData = {
  pending_generation: number;
  generated_items: number;  // Phase 5B-2: real count
  total_versions: number;   // Phase 5B-2: real count
  approved_items:     number;   // Phase 5C addition
  needs_revision:     number;   // Phase 5C addition
  rejected_items:     number;   // Phase 5C addition
};


// ── PHASE 5B-2: WORKSPACE TYPES ───────────────────────────────────────────

/**
 * A single version row from spotlight_content_versions, with its
 * generation_metadata parsed from JSONB into a typed struct.
 * Append-only by database constraint (no UPDATE/DELETE possible).
 */
export type ContentVersion = {
  id: string;
  content_item_id: string;
  version_number: number;
  body: string;
  is_generated: boolean;
  generation_metadata: GenerationMetadata | null; // null for human-edited versions
  created_at: string;
};

/**
 * Full workspace data for a single content item. Loaded by
 * fetchContentWorkspace() — heavier than ContentItemDetail, designed
 * for the generation workspace page specifically.
 */
export type ContentWorkspaceDetail = {
  // ── Item identity ────────────────────────────────────────────────────────
  id: string;
  submission_id: string;
  content_type: string;   // format field
  content_status: string;
  created_at: string;
  updated_at: string;
  // ── Generation tracking ──────────────────────────────────────────────────
  generator_version: string | null;       // e.g. 'gemini:gemini-2.5-flash'
  current_version_number: number | null;  // latest version_number (= generation count)
  generation_count: number;               // 0 if never generated
  last_generated_at: string | null;       // from latest version's metadata or created_at
  // ── Submission owner info ────────────────────────────────────────────────
  participant_name: string | null;
  category: string | null;
  submission_status: string | null;
  submitted_at: string | null;
  
  approved_version_id: string | null;
  
  // ── Versions ─────────────────────────────────────────────────────────────
  has_versions: boolean;
  version_count: number;
  all_versions: ReviewedVersion[];
  latest_version: ReviewedVersion | null;
  review_history: ContentReviewLog[];
};


// ── PHASE 5B-1: GENERATION TYPES ──────────────────────────────────────────

/**
 * Structured submission data, shaped for prompt builders. Named fields
 * cover the questionnaire answers prompts most commonly need; rawResponses
 * is the completeness fallback — anything not promoted to a named field
 * still arrives here keyed by question_key, so a future prompt can always
 * reach it without a code change to contentContext.ts.
 */
export type GenerationContext = {
  participantName: string | null;
  displayName: string | null;
  role: string | null;
  location: string | null;
  category: string | null;
  skills: string[];
  backgroundStory: string | null;
  originStory: string | null;
  biggestChallenge: string | null;
  proudestMoment: string | null;
  businessName: string | null;
  whatYouDo: string | null;
  whatMakesYouDifferent: string | null;
  whoYouHelp: string | null;
  yourVision: string | null;
  yourMotivation: string | null;
  whatYouNeed: string | null;
  messageToCommunity: string | null;
  collaborationOpen: string | null;
  oneThingRemembered: string | null;
  rawResponses: Record<string, string>;
};

export type GenerationMetadata = {
  provider: string;
  model: string;
  prompt_version: string;
  generated_at: string;
  generation_duration_ms: number;
};

export type GenerationErrorCode =
  | 'missing_content_item'
  | 'missing_submission'
  | 'invalid_content_type'
  | 'invalid_prompt'
  | 'provider_failure'
  | 'generation_timeout';

export type GenerationResult = {
  content_item_id: string;
  version_id: string;
  version_number: number;
  format: string;
  body: string;
  status: 'generated';
  metadata: GenerationMetadata;
};



// ── PHASE 5C: REVIEW TYPES ────────────────────────────────────────────────

export type ReviewAction = 'approved' | 'rejected' | 'flagged' | 'needs_revision';

/** Derived at query time — never stored directly on spotlight_content_versions */
export type VersionReviewStatus = 'generated' | 'approved' | 'rejected' | 'needs_revision';

export type ContentReviewLog = {
  id: string;
  content_item_id: string;
  version_id: string;
  action: ReviewAction;
  review_note: string;
  reviewer_id: string | null;
  reviewer_email: string;
  created_at: string;
  // Joined on fetch:
  version_number?: number;
};

/**
 * A content version enriched with its derived review status.
 * Returned by fetchContentWorkspace() — replaces the plain ContentVersion
 * in ContentWorkspaceDetail.all_versions.
 */
export type ReviewedVersion = ContentVersion & {
  review_status: VersionReviewStatus;
  is_approved_version: boolean;
  latest_review: ContentReviewLog | null;
};


// ── PHASE 4: ADMIN REVIEW TYPES ──────────────────────────────────────────



export type ReviewLogEntry = {
  id: string;
  action: string;
  reviewer_email: string;
  note: string | null;
  created_at: string;
};

export type SubmissionQueueItem = {
  id: string;
  participant_name: string | null;
  category: string | null;
  status: SpotlightSubmissionStatus;
  submitted_at: string | null;
  created_at: string;
};

export type SubmissionQueueResponse = {
  items: SubmissionQueueItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type SubmissionAnswerGroup = {
  group_title: string;
  answers: { question_text: string; answer: string }[];
};

export type AdminTimelineEvent = {
  event_label: string;
  event_description: string | null;
  created_at: string;
  is_public: boolean;
};

export type SubmissionDetail = {
  id: string;
  status: SpotlightSubmissionStatus;
  participant_name: string | null;
  email: string | null;
  category: string | null;
  skills: string[];
  submitted_at: string | null;
  agreement_accepted_at: string | null;
  agreement_version: string | null;
  rejection_reason: string | null;
  groups: SubmissionAnswerGroup[];
  timeline_events: AdminTimelineEvent[];
  review_logs: ReviewLogEntry[];
};

export type ReviewActionPayload = {
  action: ReviewAction;
  note: string;
};

export type ReviewActionResponse = {
  ok: true;
  status: SpotlightSubmissionStatus;
};

export type ReviewErrorCode =
  | 'unauthorized'
  | 'not_found'
  | 'invalid_transition'
  | 'invalid_input'
  | 'server_error';

export type ReviewErrorResponse = {
  error: string;
  code: ReviewErrorCode;
};

export type AdminDashboardSummaryData = {
  pending_count: number;
  flagged_count: number;
  approved_count: number;
  rejected_count: number;
};


// ── PHASE 6A: PUBLIC PROFILE TYPES ───────────────────────────────────────

/** One content section rendered on the public profile page. */
export type ProfileSection = {
  format: string;
  label: string;
  body: string;
  version_number: number;
};

/** Everything the public /spotlight/[slug] page renders. */
export type PublicProfile = {
  slug: string;
  participant_name: string;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  profile_image_url: string | null;
  category: string | null;
  skills: string[];
  location: string | null;
  social_links: Record<string, string>;
  is_featured: boolean;
  published_at: string;
  sections: ProfileSection[];
  sharing_caption: string | null;
};

/** One content item's status as seen from the admin profile view. */
export type AdminProfileContentItem = {
  id: string;
  format: string;
  status: string;
  has_approved_version: boolean;
};

/** Full data for the admin profile management page. */
export type AdminProfileView = {
  // Submission
  submission_id: string;
  participant_name: string | null;
  category: string | null;
  submission_status: string;
  submitted_at: string | null;
  approved_at: string | null;
  // Profile (null if not yet created)
  profile_id: string | null;
  slug: string | null;
  is_public: boolean;
  published_at: string | null;
  published_by_email: string | null;
  // Content readiness
  approved_content_count: number;
  total_content_count: number;
  content_items: AdminProfileContentItem[];
};

/** One row in the admin profiles list. */
export type AdminProfilesListItem = {
  submission_id: string;
  participant_name: string | null;
  category: string | null;
  submission_status: string;
  profile_id: string | null;
  slug: string | null;
  is_public: boolean;
  published_at: string | null;
  approved_content_count: number;
  total_content_count: number;
};

export type AdminProfilesListResponse = {
  items: AdminProfilesListItem[];
  total: number;
  page: number;
  pageSize: number; 
};

// ── PHASE 6C: DISTRIBUTION TYPES ─────────────────────────────────────────

export type PublishingChannel = {
  id: string;
  channel_key: string;
  channel_name: string;
  channel_type: 'whatsapp' | 'telegram' | 'internal' | 'external' | 'api';
  description: string | null;
  config: Record<string, unknown>;
  sort_order: number;
};

export type DistributionLogEntry = {
  id: string;
  profile_id: string;
  channel_id: string | null;
  channel_name: string;
  marked_by_email: string;
  marked_at: string;
};

/** Combines a channel with its distribution state for UI rendering. */
export type ChannelDistributionStatus = PublishingChannel & {
  is_distributed: boolean;
  log_entry: DistributionLogEntry | null;
};
 
export type FlowPhase = 'questionnaire' | 'review' | 'agreement' | 'submitting';
