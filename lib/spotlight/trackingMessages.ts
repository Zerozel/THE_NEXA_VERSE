// lib/spotlight/trackingMessages.ts
// ─────────────────────────────────────────────────────────────────────────────
// THE DEDICATED STATUS MESSAGING LAYER.
//
// All participant-facing status text and timeline-building logic lives here.
// No component or API route should hardcode a status string's meaning —
// they all call into this file.
//
// See the architecture notes in docs/spotlight-phase3e.md for why this is
// a separate, current-state layer from the frozen event_label/event_description
// already stored per-row in spotlight_tracking_events.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  SpotlightSubmissionStatus,
  StatusMessageConfig,
  TrackingTimelineEvent,
} from './types';

/**
 * The "happy path" — the order statuses occur in in normal flow.
 * 'rejected' and 'flagged' are exceptional branch states and are
 * intentionally NOT part of this array (see getNextStageConfig).
 */
export const HAPPY_PATH: SpotlightSubmissionStatus[] = [
  'submitted',
  'under_review',
  'approved',
  'queued',
  'published',
];

export const STATUS_MESSAGES: Record<SpotlightSubmissionStatus, StatusMessageConfig> = {
  draft: {
    status: 'draft',
    label: 'Draft',
    message: 'This Spotlight application has not been submitted yet.',
    icon: '📝',
    tone: 'muted',
  },
  submitted: {
    status: 'submitted',
    label: 'Submitted',
    message: 'Your Spotlight has been received and is waiting to enter review.',
    icon: '📨',
    tone: 'info',
  },
  under_review: {
    status: 'under_review',
    label: 'Under Review',
    message: 'Your Spotlight is currently being reviewed by the Spotlight team.',
    icon: '🔍',
    tone: 'info',
  },
  approved: {
    status: 'approved',
    label: 'Approved',
    message: 'Your Spotlight has been approved and is being prepared for publication.',
    icon: '✅',
    tone: 'success',
  },
  queued: {
    status: 'queued',
    label: 'Scheduled',
    message: 'Your Spotlight is scheduled for publication.',
    icon: '🗓️',
    tone: 'success',
  },
  published: {
    status: 'published',
    label: 'Published',
    message: 'Your Spotlight has been successfully published.',
    icon: '🎉',
    tone: 'success',
  },
  rejected: {
    status: 'rejected',
    label: 'Not Approved',
    message: 'Your Spotlight could not be approved at this time.',
    icon: '—',
    tone: 'muted',
  },
  flagged: {
    status: 'flagged',
    label: 'Needs Attention',
    message: 'Your Spotlight requires additional attention before proceeding.',
    icon: '⚠️',
    tone: 'warning',
  },
};

export function getStatusConfig(status: SpotlightSubmissionStatus): StatusMessageConfig {
  return STATUS_MESSAGES[status] ?? STATUS_MESSAGES.submitted;
}

/**
 * Returns the next stage on the happy path, or null if the current
 * status is terminal (published) or an exceptional branch state
 * (rejected, flagged) with no guaranteed next step.
 */
export function getNextStageConfig(status: SpotlightSubmissionStatus): StatusMessageConfig | null {
  const idx = HAPPY_PATH.indexOf(status);
  if (idx === -1 || idx === HAPPY_PATH.length - 1) return null;
  return STATUS_MESSAGES[HAPPY_PATH[idx + 1]];
}

/** Shape of a row selected from spotlight_tracking_events for timeline building. */
type RawTrackingEvent = {
  event_type: string;
  event_label: string;
  event_description: string | null;
  created_at: string;
};

/**
 * Builds the full participant-facing timeline.
 *
 * 'completed' and 'current' steps are built DIRECTLY from real database
 * rows — never hardcoded. 'upcoming' steps are computed from HAPPY_PATH
 * purely for UX (so the participant can see what's ahead) and carry no
 * timestamp, since they have not happened.
 */
export function buildTimelineSteps(
  events: RawTrackingEvent[],
  currentStatus: SpotlightSubmissionStatus,
): TrackingTimelineEvent[] {
  const historySteps: TrackingTimelineEvent[] = events.map(e => ({
    status: e.event_type as SpotlightSubmissionStatus,
    label: e.event_label,
    description: e.event_description,
    timestamp: e.created_at,
    state: 'completed',
  }));

  // The most recent real event represents where things stand right now.
  if (historySteps.length > 0) {
    historySteps[historySteps.length - 1] = {
      ...historySteps[historySteps.length - 1],
      state: 'current',
    };
  }

  // Only append upcoming steps if the submission is still progressing
  // along the happy path. Terminal/branch states (rejected, flagged,
  // published) get no upcoming steps.
  const upcomingSteps: TrackingTimelineEvent[] = [];
  const idx = HAPPY_PATH.indexOf(currentStatus);
  if (idx !== -1) {
    for (let i = idx + 1; i < HAPPY_PATH.length; i++) {
      const cfg = STATUS_MESSAGES[HAPPY_PATH[i]];
      upcomingSteps.push({
        status: cfg.status,
        label: cfg.label,
        description: null,
        timestamp: null,
        state: 'upcoming',
      });
    }
  }

  return [...historySteps, ...upcomingSteps];
}
