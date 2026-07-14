// lib/spotlight/contentTypes.ts
// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for Spotlight content asset types and their
// lifecycle states. No other file should hardcode a format string or a
// content status string — import from here instead.
//
// NOTE: the database CHECK constraints in 003_spotlight_content_foundation.sql
// describe this exact same vocabulary, but as a SQL guardrail, not a second
// source of truth — SQL and TypeScript can't literally share a runtime
// value across the language boundary. If a 7th content type or a new
// lifecycle state is ever added, update BOTH this file and that migration.
// ─────────────────────────────────────────────────────────────────────────────

// ── CONTENT ASSET TYPES ───────────────────────────────────────────────────

export const CONTENT_TYPES = {
  SPOTLIGHT_INTRO:     'spotlight_intro',
  FOUNDER_STORY:       'founder_story',
  SERVICE_HIGHLIGHT:   'service_highlight',
  COMMUNITY_QUESTION:  'community_question',
  WHATSAPP_SHORT:      'whatsapp_short',
  CHANNEL_LONG:        'channel_long',
} as const;

export type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];

export const ALL_CONTENT_TYPES: ContentType[] = Object.values(CONTENT_TYPES);

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  spotlight_intro:     'Spotlight Intro',
  founder_story:       'Founder Story',
  service_highlight:   'Service Highlight',
  community_question:  'Community Question',
  whatsapp_short:       'WhatsApp Short',
  channel_long:         'Channel Long-Form',
};

export const CONTENT_TYPE_DESCRIPTIONS: Record<ContentType, string> = {
  spotlight_intro:     'A short intro post for community group sharing.',
  founder_story:       'A longer narrative covering the founder\u2019s background.',
  service_highlight:   'A focused piece on the participant\u2019s service or offering.',
  community_question:  'A discussion prompt to engage the community.',
  whatsapp_short:        'A status-length summary for WhatsApp.',
  channel_long:          'A formatted, longer-form post for channel distribution.',
};

export function isValidContentType(value: string): value is ContentType {
  return (ALL_CONTENT_TYPES as string[]).includes(value);
}

// ── CONTENT LIFECYCLE STATES ──────────────────────────────────────────────
// Deliberately separate from spotlight_submissions.status (the SUBMISSION
// stays 'approved' forever after this point — only the CONTENT items move
// through their own, independent lifecycle). Only PENDING_GENERATION is
// ever set by this phase; the rest are established now so later phases
// don't need another migration, but nothing in this phase sets them.

export const CONTENT_STATUS = {
  PENDING_GENERATION: 'pending_generation', // set by Phase 5A
  GENERATED:          'generated',          // Phase 5B
  REVIEWED:            'reviewed',            // Phase 5C
  APPROVED:            'approved',            // Phase 5C
  QUEUED:              'queued',              // Phase 6
  PUBLISHED:           'published',           // Phase 6
} as const;

export type ContentStatus = typeof CONTENT_STATUS[keyof typeof CONTENT_STATUS];

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  pending_generation: 'Pending Generation',
  generated:            'Generated',
  reviewed:              'Reviewed',
  approved:              'Approved',
  queued:                'Queued',
  published:             'Published',
};

export const INITIAL_CONTENT_STATUS: ContentStatus = CONTENT_STATUS.PENDING_GENERATION;
