// lib/spotlight/contentReview.ts
// ─────────────────────────────────────────────────────────────────────────────
// SERVER-ONLY. Business logic for content version review.
// Every function is side-effect-free except the write functions, which
// always append (never update or delete).
//
// Review state model:
//   generated       ← all versions start here after AI generation
//     ↓  ↓  ↓
//   approved  rejected  needs_revision
//     ↑ (a different version can be approved later — re-approval)
//     ↓ (an approved version can be rejected or sent back)
//
// Source of truth:
//   spotlight_content_review_logs  — the audit trail; latest row = current state
//   spotlight_content_items.approved_version_id  — fast lookup for approved version
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ReviewAction,
  VersionReviewStatus,
  ContentReviewLog,
  ReviewedVersion,
  ContentVersion,
  GenerationMetadata,
} from './types';

export class ContentReviewError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ContentReviewError';
    this.code = code;
  }
}

// ── DERIVE VERSION REVIEW STATUS ──────────────────────────────────────────
// Called per-version when building the workspace. Never queries the DB
// directly — receives the pre-loaded data it needs.

export function deriveVersionStatus(
  versionId: string,
  approvedVersionId: string | null,
  latestLog: ContentReviewLog | null,
): VersionReviewStatus {
  if (approvedVersionId === versionId) return 'approved';
  if (!latestLog) return 'generated';
  return latestLog.action as VersionReviewStatus;
}

// ── FETCH REVIEW HISTORY ──────────────────────────────────────────────────
// All review actions for a content item, newest first.
// Joined to spotlight_content_versions for version_number display.

export async function fetchReviewHistory(
  db: SupabaseClient,
  contentItemId: string,
): Promise<ContentReviewLog[]> {
  const { data, error } = await db
    .from('spotlight_content_review_logs')
    .select(`
      id,
      content_item_id,
      version_id,
      action,
      review_note,
      reviewer_id,
      reviewer_email,
      created_at,
      spotlight_content_versions!version_id (version_number)
    `)
    .eq('content_item_id', contentItemId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new ContentReviewError('Failed to load review history.', 'server_error');
  }

  return (data ?? []).map(row => ({
    id: row.id,
    content_item_id: row.content_item_id,
    version_id: row.version_id,
    action: row.action as ReviewAction,
    review_note: row.review_note,
    reviewer_id: row.reviewer_id,
    reviewer_email: row.reviewer_email,
    created_at: row.created_at,
    version_number: (row.spotlight_content_versions as { version_number: number }[])?.[0]?.version_number,
  }));
}

// ── ENRICH VERSIONS WITH REVIEW STATUS ───────────────────────────────────
// Takes the already-loaded versions + review history and derives the
// effective review status for each version. Used by fetchContentWorkspace.
// No additional DB queries — all data is passed in.

export function enrichVersionsWithReviewStatus(
  versions: ContentVersion[],
  reviewHistory: ContentReviewLog[],
  approvedVersionId: string | null,
): ReviewedVersion[] {
  // Build a map: versionId → latest review log entry
  const latestLogByVersion = new Map<string, ContentReviewLog>();
  // reviewHistory is newest-first, so iterating in reverse gives us the
  // oldest entry last — we want the NEWEST, so iterate forward and overwrite
  // (or just iterate once since it's newest-first: first seen = newest)
  for (const log of [...reviewHistory].reverse()) {
    latestLogByVersion.set(log.version_id, log);
  }
  // Re-iterate newest-first so first set wins (newest entry wins)
  const latestLogs = new Map<string, ContentReviewLog>();
  for (const log of reviewHistory) {
    if (!latestLogs.has(log.version_id)) {
      latestLogs.set(log.version_id, log);
    }
  }

  return versions.map(v => ({
    ...v,
    review_status: deriveVersionStatus(v.id, approvedVersionId, latestLogs.get(v.id) ?? null),
    is_approved_version: v.id === approvedVersionId,
    latest_review: latestLogs.get(v.id) ?? null,
  }));
}

// ── REVIEW A VERSION ──────────────────────────────────────────────────────
// The single function that handles all three review actions.
// Validates inputs, writes the log entry, updates the content item pointer.

export async function reviewContentVersion(
  db: SupabaseClient,
  versionId: string,
  action: ReviewAction,
  reviewNote: string,
  reviewerId: string,
  reviewerEmail: string,
): Promise<{ log_id: string }> {

  // ── Validate note ───────────────────────────────────────────────────────
  if (!reviewNote || reviewNote.trim().length === 0) {
    throw new ContentReviewError('A review note is required for all review actions.', 'missing_note');
  }
  if (reviewNote.trim().length < 5) {
    throw new ContentReviewError('Review note must be at least 5 characters.', 'note_too_short');
  }

  // ── Load version + content item ────────────────────────────────────────
  const { data: version, error: vErr } = await db
    .from('spotlight_content_versions')
    .select('id, content_item_id, version_number')
    .eq('id', versionId)
    .maybeSingle();

  if (vErr || !version) {
    throw new ContentReviewError('Content version not found.', 'missing_version');
  }

  const { data: item, error: iErr } = await db
    .from('spotlight_content_items')
    .select('id, status, approved_version_id')
    .eq('id', version.content_item_id)
    .maybeSingle();

  if (iErr || !item) {
    throw new ContentReviewError('Content item not found.', 'missing_content_item');
  }

  // ── Guard: already in target state ────────────────────────────────────
  // Prevent approving a version that is already the approved version.
  // (Re-approving after rejection is fine — guard only same-action repeat.)
  if (action === 'approved' && item.approved_version_id === versionId) {
    throw new ContentReviewError(
      'This version is already the approved version for this content item.',
      'already_approved',
    );
  }

  // ── Write the review log entry ─────────────────────────────────────────
  // Always INSERT — never UPDATE. This is the append-only audit trail.
  const { data: log, error: logErr } = await db
    .from('spotlight_content_review_logs')
    .insert({
      content_item_id: version.content_item_id,
      version_id:      versionId,
      action,
      review_note:     reviewNote.trim(),
      reviewer_id:     reviewerId,
      reviewer_email:  reviewerEmail,
    })
    .select('id')
    .single();

  if (logErr || !log) {
    throw new ContentReviewError('Failed to write review log entry.', 'log_write_failed');
  }

  // ── Update content item ────────────────────────────────────────────────
  // The log entry is already written and is the permanent record.
  // Content item updates are secondary — a failure here is logged but
  // does not roll back the log entry (consistent with Phase 4/5A precedent).
  const now = new Date().toISOString();

  if (action === 'approved') {
    const { error: updateErr } = await db
      .from('spotlight_content_items')
      .update({
        approved_version_id: versionId,
        approved_by:         reviewerId,
        approved_at:         now,
        status:              'approved',
        updated_at:          now,
      })
      .eq('id', version.content_item_id);

    if (updateErr) {
      console.error('[reviewContentVersion] content_item update failed after log write', updateErr);
    }
  } else {
    // rejected or needs_revision:
    // If the version being rejected/revised was the approved one, clear the pointer.
    const update: Record<string, unknown> = {
      status:     action === 'needs_revision' ? 'needs_revision' : 'rejected',
      updated_at: now,
    };

    if (item.approved_version_id === versionId) {
      update.approved_version_id = null;
      update.approved_by         = null;
      update.approved_at         = null;
    }

    const { error: updateErr } = await db
      .from('spotlight_content_items')
      .update(update)
      .eq('id', version.content_item_id);

    if (updateErr) {
      console.error('[reviewContentVersion] content_item update failed after log write', updateErr);
    }
  }

  return { log_id: log.id };
}

// ── GET APPROVED VERSION ──────────────────────────────────────────────────
// Returns the currently approved version for a content item, or null.

export async function getApprovedVersion(
  db: SupabaseClient,
  contentItemId: string,
): Promise<ContentVersion | null> {
  const { data: item } = await db
    .from('spotlight_content_items')
    .select('approved_version_id')
    .eq('id', contentItemId)
    .maybeSingle();

  if (!item?.approved_version_id) return null;

  const { data: version } = await db
    .from('spotlight_content_versions')
    .select('id, content_item_id, version_number, body, is_generated, generation_metadata, created_at')
    .eq('id', item.approved_version_id)
    .maybeSingle();

  if (!version) return null;

  return {
    id:                  version.id,
    content_item_id:     version.content_item_id,
    version_number:      version.version_number,
    body:                version.body ?? '',
    is_generated:        version.is_generated ?? false,
    generation_metadata: (version.generation_metadata as GenerationMetadata | null) ?? null,
    created_at:          version.created_at,
  };
}
