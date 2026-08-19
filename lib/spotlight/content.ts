// lib/spotlight/content.ts
// ─────────────────────────────────────────────────────────────────────────────
// SERVER-ONLY. The Spotlight content service layer for Phase 5A.
// No UI logic lives here — every function returns plain data or throws
// a ContentServiceError; pages and API routes decide how to present that.
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContentVersion, ContentWorkspaceDetail } from './types';
import type { GenerationMetadata } from './types';
import { fetchProfileFacts } from './adminReview'; // exported in this phase — see note below
import {
  ALL_CONTENT_TYPES,
  INITIAL_CONTENT_STATUS,
  type ContentType,
} from './contentTypes';
import type {
  ContentQueueItem,
  ContentQueueResponse,
  ContentItemDetail,
  ContentMetricsData,
  SpotlightSubmissionStatus,
} from './types';

import {
  fetchReviewHistory,
  enrichVersionsWithReviewStatus,
} from './contentReview';

export class ContentServiceError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

// ── CONTENT ASSET CREATION ────────────────────────────────────────────────
// Called from inside Phase 4's approval route immediately after a
// submission transitions to 'approved'. Creates the six required content
// asset containers. Idempotent by construction: relies on the
// unique(submission_id, format) constraint + ON CONFLICT DO NOTHING, so
// calling this twice (or with a partially-completed prior attempt) never
// creates duplicate rows and never errors on a repeat call.
//
// Creates NO content. body is an empty placeholder (the column is NOT
// NULL); real text arrives only in Phase 5B. generator_version is left at
// its schema default ('stub-1.0') since no generator has run.

export async function createContentAssetsForSubmission(
  db: SupabaseClient,
  submissionId: string,
): Promise<{ created: number; alreadyExisted: boolean }> {
  const { data: submission, error: subError } = await db
    .from('spotlight_submissions')
    .select('id')
    .eq('id', submissionId)
    .maybeSingle();

  if (subError) {
    throw new ContentServiceError('Database error while verifying the submission.', 'server_error');
  }
  if (!submission) {
    throw new ContentServiceError('Submission not found.', 'missing_submission');
  }

  const rows = ALL_CONTENT_TYPES.map((format: ContentType) => ({
    submission_id: submissionId,
    format,
    body:   '',
    status: INITIAL_CONTENT_STATUS,
  }));

  const { data, error } = await db
    .from('spotlight_content_items')
    .upsert(rows, { onConflict: 'submission_id,format', ignoreDuplicates: true })
    .select('id');

  if (error) {
    throw new ContentServiceError('Could not create content assets.', 'creation_failed');
  }

  // With ignoreDuplicates, only newly-inserted rows are returned — already-
  // existing rows are silently skipped by Postgres and never appear here.
  const createdCount = data?.length ?? 0;
  return { created: createdCount, alreadyExisted: createdCount === 0 };
}

// ── ADMIN CONTENT QUEUE ────────────────────────────────────────────────────
// Same bounded-working-set + in-memory search pattern as Phase 4's
// getSubmissionQueue — see that file's docs for the full rationale
// (category isn't a real, populated column; see Phase 4's design notes).

const CONTENT_WORKING_SET_CAP = 1000;

export async function getContentQueue(
  db: SupabaseClient,
  page: number,
  pageSize: number,
  search: string,
  statusFilter: string,
): Promise<ContentQueueResponse> {
  let query = db
    .from('spotlight_content_items')
    .select(`
      id, 
      submission_id, 
      format, 
      status, 
      title,
      created_at, 
      current_version, 
      updated_at
    `)
    .order('created_at', { ascending: false })
    .limit(CONTENT_WORKING_SET_CAP);

  if (statusFilter) query = query.eq('status', statusFilter);

  const { data: rows, error } = await query;
  if (error) throw error;

  const submissionIds = Array.from(new Set((rows ?? []).map(r => r.submission_id)));
  if (submissionIds.length === 0) {
    return { items: [], total: 0, page, pageSize };
  }

  const { data: submissions } = await db
    .from('spotlight_submissions')
    .select('id, participant_name, submitted_at')
    .in('id', submissionIds);

  const submissionMap = new Map((submissions ?? []).map(s => [s.id, s]));
  const factsMap      = await fetchProfileFacts(db, submissionIds);

  let items: ContentQueueItem[] = (rows ?? []).map(r => {
    const sub = submissionMap.get(r.submission_id);
    return {
      id: r.id,
      submission_id: r.submission_id,
      participant_name: sub?.participant_name ?? null,
      format: r.format,
      status: r.status,
      title: r.title || null,
      category: factsMap[r.submission_id]?.category ?? null,
      submitted_at: sub?.submitted_at ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at || r.created_at,
      current_version: r.current_version ?? null,
      generation_count: r.current_version ?? 0,
      last_generated_at: r.status === 'generated' ? (r.updated_at ?? null) : null,
    };
  });

  if (search) {
    const needle = search.toLowerCase();
    items = items.filter(i => (i.participant_name ?? '').toLowerCase().includes(needle));
  }

  const total = items.length;
  const from  = page * pageSize;
  const paged = items.slice(from, from + pageSize);

  return { items: paged, total, page, pageSize };
}

// ── CONTENT ITEM DETAIL ───────────────────────────────────────────────────
// Counts spotlight_content_versions rows for this item — THE mechanism
// the detail page uses to safely detect "0 versions" and render the
// "Awaiting Generation" state Phase 5A requires, with zero version rows
// ever created by this phase.

export async function getContentItemDetail(
  db: SupabaseClient,
  id: string,
): Promise<ContentItemDetail | null> {
  const { data: item, error } = await db
    .from('spotlight_content_items')
    .select('id, submission_id, format, status, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error || !item) return null;

  const { data: submission } = await db
    .from('spotlight_submissions')
    .select('id, participant_name, submitted_at, status')
    .eq('id', item.submission_id)
    .maybeSingle();

  const { count: versionCount } = await db
    .from('spotlight_content_versions')
    .select('id', { count: 'exact', head: true })
    .eq('content_item_id', id);

  const factsMap = await fetchProfileFacts(db, [item.submission_id]);

  return {
    id: item.id,
    submission_id: item.submission_id,
    participant_name: submission?.participant_name ?? null,
    category: factsMap[item.submission_id]?.category ?? null,
    submission_status: (submission?.status as SpotlightSubmissionStatus) ?? null,
    submitted_at: submission?.submitted_at ?? null,
    content_type: item.format,
    content_status: item.status,
    created_at: item.created_at,
    updated_at: item.updated_at,
    has_versions: (versionCount ?? 0) > 0,
    version_count: versionCount ?? 0,
  };
}

// ── DASHBOARD METRICS ─────────────────────────────────────────────────────
// Returns ONLY pending_generation — the one status this phase can actually
// produce. "Generated" and "Ready for Review" are NOT included here; a
// fabricated zero for a status nothing can reach yet isn't real data. The
// dashboard UI renders those as visually-distinct "coming soon" cards
// instead of fake counts — see ContentMetricsSummary below.

export async function getContentMetrics(db: SupabaseClient): Promise<ContentMetricsData> {
  const [pendingRes, generatedRes, approvedRes, needsRevisionRes, rejectedRes, versionsRes] =
    await Promise.all([
      db.from('spotlight_content_items').select('id', { count: 'exact', head: true }).eq('status', 'pending_generation'),
      db.from('spotlight_content_items').select('id', { count: 'exact', head: true }).eq('status', 'generated'),
      db.from('spotlight_content_items').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      db.from('spotlight_content_items').select('id', { count: 'exact', head: true }).eq('status', 'needs_revision'),
      db.from('spotlight_content_items').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
      db.from('spotlight_content_versions').select('id', { count: 'exact', head: true }),
    ]);

  return {
    pending_generation: pendingRes.count   ?? 0,
    generated_items:   generatedRes.count  ?? 0,
    approved_items:    approvedRes.count    ?? 0,
    needs_revision:    needsRevisionRes.count ?? 0,
    rejected_items:    rejectedRes.count    ?? 0,
    total_versions:    versionsRes.count    ?? 0,
  };
}


/**
 * Loads everything the generation workspace page needs in 3–4 DB calls.
 * Returns null if the content item doesn't exist.
 *
 * NOT a replacement for getContentItemDetail() — that function stays and
 * is still used by other code paths that don't need version history.
 * This is the workspace-specific, heavier loader.
 */
export async function fetchContentWorkspace(
  db: SupabaseClient,
  id: string,
): Promise<ContentWorkspaceDetail | null> {
  // ── 1. Content item — with review + generation columns ────────────────
  const { data: item, error: itemError } = await db
    .from('spotlight_content_items')
    .select(`
      id, submission_id, format, status, created_at, updated_at,
      current_version, generator_version, approved_version_id,
      approved_by, approved_at
    `)
    .eq('id', id)
    .maybeSingle();

  if (itemError || !item) return null;

  // ── 2. Submission + profile facts + versions + review history — parallel
  const [submissionRes, factsMap, versionRows, reviewHistory] = await Promise.all([
    db
      .from('spotlight_submissions')
      .select('id, participant_name, submitted_at, status')
      .eq('id', item.submission_id)
      .maybeSingle(),
    fetchProfileFacts(db, [item.submission_id]),
    db
      .from('spotlight_content_versions')
      .select('id, content_item_id, version_number, body, is_generated, generation_metadata, created_at')
      .eq('content_item_id', id)
      .order('version_number', { ascending: false }),
    fetchReviewHistory(db, id),
  ]);

  const submission = submissionRes.data;
  const facts      = factsMap[item.submission_id] ?? { category: null, skills: [] };

  const rawVersions: ContentVersion[] = (versionRows.data ?? []).map(v => ({
    id:                  v.id,
    content_item_id:     v.content_item_id,
    version_number:      v.version_number,
    body:                v.body ?? '',
    is_generated:        v.is_generated ?? false,
    generation_metadata: (v.generation_metadata as GenerationMetadata | null) ?? null,
    created_at:          v.created_at,
  }));

  // Enrich versions with derived review status (no additional DB queries)
  const allVersions = enrichVersionsWithReviewStatus(
    rawVersions,
    reviewHistory,
    item.approved_version_id ?? null,
  );

  const latestVersion    = allVersions[0] ?? null;
  const versionCount     = allVersions.length;
  const generationCount  = item.current_version ?? 0;
  const lastGeneratedAt  =
    latestVersion?.generation_metadata?.generated_at ??
    latestVersion?.created_at ??
    null;

  return {
    id:                    item.id,
    submission_id:         item.submission_id,
    content_type:          item.format,
    content_status:        item.status,
    created_at:            item.created_at,
    updated_at:            item.updated_at,
    generator_version:     item.generator_version ?? null,
    current_version_number: item.current_version ?? null,
    generation_count:      generationCount,
    last_generated_at:     lastGeneratedAt,
    approved_version_id:   item.approved_version_id ?? null,
    participant_name:      submission?.participant_name ?? null,
    category:              facts.category,
    submission_status:     submission?.status ?? null,
    submitted_at:          submission?.submitted_at ?? null,
    has_versions:          versionCount > 0,
    version_count:         versionCount,
    latest_version:        latestVersion,
    all_versions:          allVersions,
    review_history:        reviewHistory,
  };
}
