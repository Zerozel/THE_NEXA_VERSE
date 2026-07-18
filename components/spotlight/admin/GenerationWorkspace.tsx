'use client';
// components/spotlight/admin/GenerationWorkspace.tsx
// Phase 5B-2 + Phase 5C: Generation workspace with integrated review controls.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_DESCRIPTIONS,
  CONTENT_STATUS_LABELS,
} from '@/lib/spotlight/contentTypes';
import type {
  ContentWorkspaceDetail,
  ReviewedVersion,
  GenerationResult,
  ReviewAction,
  VersionReviewStatus,
} from '@/lib/spotlight/types';

// ── HELPERS ────────────────────────────────────────────────────────────────

const GEN_ERROR_MESSAGES: Record<string, string> = {
  missing_content_item:  'Content item not found. It may have been deleted.',
  missing_submission:    'The submission for this content no longer exists.',
  invalid_content_type:  'This content type is not recognised by the generation engine.',
  invalid_prompt:        'Could not build a generation prompt. Ensure the submission has complete questionnaire responses.',
  provider_failure:      'The AI provider returned an error. Verify GEMINI_API_KEY is set correctly and try again.',
  generation_timeout:    'Generation timed out after 30 seconds. The provider may be under load — try again shortly.',
};

const REVIEW_ERROR_MESSAGES: Record<string, string> = {
  missing_note:          'A review note is required.',
  note_too_short:        'Review note must be at least 5 characters.',
  missing_version:       'This version no longer exists.',
  missing_content_item:  'This content item no longer exists.',
  already_approved:      'This version is already the approved version.',
};

const REVIEW_STATUS_CONFIG: Record<VersionReviewStatus, { label: string; className: string }> = {
  generated:      { label: 'Generated',      className: 'text-blue-700 bg-blue-50 border-blue-200' },
  approved:       { label: 'Approved',        className: 'text-green-700 bg-green-50 border-green-200' },
  rejected:       { label: 'Rejected',        className: 'text-red-700 bg-red-50 border-red-200' },
  needs_revision: { label: 'Needs Revision',  className: 'text-amber-700 bg-amber-50 border-amber-200' },
};

function formatDuration(ms: number): string {
  return ms < 10_000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms / 1000)}s`;
}
function formatDatetime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[0.62rem] font-black text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value ?? '—'}</p>
    </div>
  );
}

// ── SECTION 1: CONTENT ASSET SUMMARY ──────────────────────────────────────

function ContentAssetSummary({ workspace }: { workspace: ContentWorkspaceDetail }) {
  const typeLabel   = CONTENT_TYPE_LABELS[workspace.content_type as keyof typeof CONTENT_TYPE_LABELS] ?? workspace.content_type;
  const statusLabel = CONTENT_STATUS_LABELS[workspace.content_status as keyof typeof CONTENT_STATUS_LABELS] ?? workspace.content_status;

  const statusColor =
    workspace.content_status === 'approved'        ? 'text-green-700 bg-green-50 border-green-200' :
    workspace.content_status === 'needs_revision'  ? 'text-amber-700 bg-amber-50 border-amber-200' :
    workspace.content_status === 'rejected'        ? 'text-red-700 bg-red-50 border-red-200' :
    workspace.content_status === 'generated'       ? 'text-blue-700 bg-blue-50 border-blue-200' :
                                                     'text-gray-700 bg-gray-50 border-gray-200';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider">Content Asset</h2>
        <span className={`text-[0.7rem] font-black border px-2.5 py-1 rounded-full uppercase tracking-wide ${statusColor}`}>
          {statusLabel}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <MetaRow label="Content Type"   value={typeLabel} />
        <MetaRow label="Participant"    value={workspace.participant_name ?? 'Unknown'} />
        <MetaRow label="Category"       value={workspace.category} />
        <MetaRow label="Submitted"      value={workspace.submitted_at ? new Date(workspace.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
        <MetaRow label="Last Generated" value={workspace.last_generated_at ? formatDatetime(workspace.last_generated_at) : null} />
        <MetaRow label="Versions"       value={workspace.generation_count > 0 ? `${workspace.generation_count} version${workspace.generation_count === 1 ? '' : 's'}` : 'None yet'} />
      </div>
    </div>
  );
}

// ── SECTION 2: GENERATION CONTROLS ────────────────────────────────────────

type GenState = 'idle' | 'generating' | 'success' | 'error';

function GenerationControls({
  itemId,
  hasVersions,
  genState,
  genError,
  onGenerate,
}: {
  itemId: string;
  hasVersions: boolean;
  genState: GenState;
  genError: string | null;
  onGenerate: () => void;
}) {
  const isGenerating = genState === 'generating';
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-4">Generation Controls</h2>
      <div className="flex flex-col gap-3">
        {!hasVersions ? (
          <button onClick={onGenerate} disabled={isGenerating}
            className="w-full bg-[#D4AF37] hover:bg-[#C9A227] disabled:opacity-60 disabled:cursor-not-allowed text-black font-black text-sm py-3.5 px-5 rounded-xl transition-colors">
            {isGenerating ? '⏳  Generating…' : '✦  Generate Content'}
          </button>
        ) : (
          <button onClick={onGenerate} disabled={isGenerating}
            className="w-full bg-gray-900 hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-sm py-3.5 px-5 rounded-xl transition-colors">
            {isGenerating ? '⏳  Generating…' : '↺  Regenerate Content'}
          </button>
        )}
        {genState === 'generating' && (
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
            <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-[#D4AF37] rounded-full animate-spin" />
            Calling Gemini 2.5 Flash…
          </div>
        )}
        {genState === 'success' && (
          <div className="text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            ✓  Content generated. New version created — review it below.
          </div>
        )}
        {genState === 'error' && genError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="font-black mb-1">Generation Failed</p>
            <p className="leading-relaxed">{genError}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SECTION 3: VERSION VIEWER + REVIEW CONTROLS ───────────────────────────

function VersionViewer({
  version,
  onReview,
  reviewState,
  reviewError,
  reviewNote,
  onNoteChange,
}: {
  version: ReviewedVersion | null;
  onReview: (action: ReviewAction) => void;
  reviewState: 'idle' | 'submitting' | 'success' | 'error';
  reviewError: string | null;
  reviewNote: string;
  onNoteChange: (note: string) => void;
}) {
  if (!version) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <p className="text-4xl mb-3">✍️</p>
        <p className="font-black text-gray-700 text-sm mb-1">Awaiting Generation</p>
        <p className="text-gray-400 text-xs max-w-xs mx-auto leading-relaxed">
          No content has been generated yet. Use the Generation Controls above to create the first version.
        </p>
      </div>
    );
  }

  const meta        = version.generation_metadata;
  const statusConf  = REVIEW_STATUS_CONFIG[version.review_status];
  const isSubmitting = reviewState === 'submitting';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider">Version {version.version_number}</h2>
          {version.is_approved_version && (
            <span className="text-[0.65rem] font-black text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full uppercase tracking-wide">
              ✓ Approved
            </span>
          )}
        </div>
        <span className={`text-[0.65rem] font-black border px-2 py-0.5 rounded-full uppercase tracking-wide ${statusConf.className}`}>
          {statusConf.label}
        </span>
      </div>

      {/* Generated content body */}
      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-[inherit] min-h-[120px] max-h-[420px] overflow-y-auto border border-gray-100 mb-4">
        {version.body || <span className="text-gray-400 italic">No content body.</span>}
      </div>

      {/* Generation metadata */}
      {meta && (
        <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-gray-100">
          <MetaRow label="Generated At"    value={formatDatetime(meta.generated_at)} />
          <MetaRow label="Duration"         value={formatDuration(meta.generation_duration_ms)} />
          <MetaRow label="Prompt Version"   value={meta.prompt_version} />
        </div>
      )}

      {/* Latest review decision (if any) */}
      {version.latest_review && (
        <div className={`rounded-xl px-4 py-3 mb-4 border ${REVIEW_STATUS_CONFIG[version.latest_review.action as VersionReviewStatus].className}`}>
          <p className="text-xs font-black uppercase tracking-wider mb-1">
            Last Review · {version.latest_review.action.replace('_', ' ')}
          </p>
          <p className="text-sm leading-relaxed">"{version.latest_review.review_note}"</p>
          <p className="text-[0.65rem] mt-1 opacity-70">
            {version.latest_review.reviewer_email} · {formatDatetime(version.latest_review.created_at)}
          </p>
        </div>
      )}

      {/* ── REVIEW CONTROLS ──────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Review this version</p>
        <textarea
          value={reviewNote}
          onChange={e => onNoteChange(e.target.value)}
          placeholder="Write a review note (required for all actions)…"
          rows={3}
          disabled={isSubmitting}
          className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 mb-3 resize-none outline-none focus:border-[#D4AF37] disabled:opacity-60 font-[inherit]"
        />
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onReview('approved')}
            disabled={isSubmitting || version.is_approved_version}
            title={version.is_approved_version ? 'Already the approved version' : undefined}
            className="py-2.5 px-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black transition-colors"
          >
            {isSubmitting ? '…' : '✓ Approve'}
          </button>
          <button
            onClick={() => onReview('needs_revision')}
            disabled={isSubmitting}
            className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black transition-colors"
          >
            {isSubmitting ? '…' : '↺ Needs Revision'}
          </button>
          <button
            onClick={() => onReview('rejected')}
            disabled={isSubmitting}
            className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black transition-colors"
          >
            {isSubmitting ? '…' : '✕ Reject'}
          </button>
        </div>
        {reviewState === 'success' && (
          <p className="text-xs text-green-700 font-semibold mt-2 text-center">Review recorded.</p>
        )}
        {reviewState === 'error' && reviewError && (
          <p className="text-xs text-red-600 font-semibold mt-2 text-center">{reviewError}</p>
        )}
      </div>
    </div>
  );
}

// ── SECTION 4: VERSION HISTORY ─────────────────────────────────────────────

function VersionHistory({
  versions,
  selectedVersionId,
  onSelect,
}: {
  versions: ReviewedVersion[];
  selectedVersionId: string | null;
  onSelect: (id: string) => void;
}) {
  if (versions.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-4">
        Version History
        <span className="ml-2 text-[0.65rem] font-bold text-gray-400 normal-case tracking-normal">
          {versions.length} version{versions.length === 1 ? '' : 's'} · newest first
        </span>
      </h2>
      <div className="space-y-2">
        {versions.map(v => {
          const isSelected = v.id === selectedVersionId;
          const statusConf  = REVIEW_STATUS_CONFIG[v.review_status];
          return (
            <button key={v.id} onClick={() => onSelect(v.id)}
              className={`w-full text-left rounded-xl px-4 py-3 border transition-colors ${isSelected ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black ${isSelected ? 'text-[#C9A227]' : 'text-gray-700'}`}>v{v.version_number}</span>
                  {v.is_approved_version && (
                    <span className="text-[0.6rem] font-black text-green-700 bg-green-100 border border-green-200 px-1.5 py-0.5 rounded-full">✓ APPROVED</span>
                  )}
                  <span className={`text-[0.6rem] font-black border px-1.5 py-0.5 rounded-full ${statusConf.className}`}>
                    {statusConf.label}
                  </span>
                </div>
                <span className="text-[0.68rem] text-gray-400">
                  {new Date(v.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                {v.body?.slice(0, 140) || '(no content)'}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── SECTION 5: REVIEW HISTORY ─────────────────────────────────────────────

function ReviewHistoryPanel({ history }: { history: ContentWorkspaceDetail['review_history'] }) {
  if (history.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-4">
        Review History
        <span className="ml-2 text-[0.65rem] font-bold text-gray-400 normal-case tracking-normal">
          {history.length} decision{history.length === 1 ? '' : 's'}
        </span>
      </h2>
      <div className="space-y-3">
        {history.map(log => {
          const statusConf = REVIEW_STATUS_CONFIG[log.action as VersionReviewStatus];
          return (
            <div key={log.id} className="border-l-2 border-gray-200 pl-4">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[0.65rem] font-black border px-1.5 py-0.5 rounded-full ${statusConf.className}`}>
                  {statusConf.label}
                </span>
                {log.version_number != null && (
                  <span className="text-[0.65rem] text-gray-400 font-semibold">v{log.version_number}</span>
                )}
              </div>
              <p className="text-sm text-gray-800 leading-relaxed">"{log.review_note}"</p>
              <p className="text-[0.65rem] text-gray-400 mt-1">
                {log.reviewer_email} · {formatDatetime(log.created_at)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN EXPORT ────────────────────────────────────────────────────────────

export default function GenerationWorkspace({
  workspace,
  itemId,
}: {
  workspace: ContentWorkspaceDetail;
  itemId: string;
}) {
  const router                           = useRouter();
  const [, startTransition]             = useTransition();

  // Generation state
  const [genState, setGenState]         = useState<GenState>('idle');
  const [genError, setGenError]         = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<GenerationResult | null>(null);

  // Review state
  const [reviewState, setReviewState]   = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [reviewError, setReviewError]   = useState<string | null>(null);
  const [reviewNote, setReviewNote]     = useState('');

  // Version selection
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // ── Immediate result after generation (before server refresh) ──────────
  const immediateVersion: ReviewedVersion | null =
    latestResult && !workspace.all_versions.some(v => v.id === latestResult.version_id)
      ? {
          id:                  latestResult.version_id,
          content_item_id:     latestResult.content_item_id,
          version_number:      latestResult.version_number,
          body:                latestResult.body,
          is_generated:        true,
          generation_metadata: latestResult.metadata,
          created_at:          new Date().toISOString(),
          review_status:       'generated',
          is_approved_version: false,
          latest_review:       null,
        }
      : null;

  const allVersions: ReviewedVersion[] =
    immediateVersion && !workspace.all_versions.some(v => v.id === immediateVersion.id)
      ? [immediateVersion, ...workspace.all_versions]
      : workspace.all_versions;

  const latestVersion = allVersions[0] ?? null;
  const displayedVersion: ReviewedVersion | null =
    selectedVersionId
      ? (allVersions.find(v => v.id === selectedVersionId) ?? latestVersion)
      : (immediateVersion ?? latestVersion);

  const hasVersions = allVersions.length > 0;

  // ── Generation handler ─────────────────────────────────────────────────
  async function handleGenerate() {
    setGenState('generating');
    setGenError(null);
    setSelectedVersionId(null);
    setReviewState('idle');
    setReviewNote('');

    try {
      const res  = await fetch(`/api/spotlight/admin/content/${itemId}/generate`, { method: 'POST' });
      const data = await res.json() as { ok?: boolean; result?: GenerationResult; error?: string; code?: string };

      if (!res.ok) {
        setGenError(GEN_ERROR_MESSAGES[data.code ?? ''] ?? data.error ?? 'Generation failed unexpectedly.');
        setGenState('error');
        return;
      }
      if (data.result) setLatestResult(data.result);
      setGenState('success');
      startTransition(() => { router.refresh(); });
    } catch {
      setGenError('Network error — could not reach the generation endpoint.');
      setGenState('error');
    }
  }

  // ── Review handler ─────────────────────────────────────────────────────
  async function handleReview(action: ReviewAction) {
    if (!displayedVersion) return;
    if (!reviewNote.trim()) {
      setReviewState('error');
      setReviewError('A review note is required.');
      return;
    }

    setReviewState('submitting');
    setReviewError(null);

    try {
      const res  = await fetch(`/api/spotlight/admin/content/versions/${displayedVersion.id}/review`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, review_note: reviewNote }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; code?: string };

      if (!res.ok) {
        setReviewError(REVIEW_ERROR_MESSAGES[data.code ?? ''] ?? data.error ?? 'Review action failed.');
        setReviewState('error');
        return;
      }

      setReviewState('success');
      setReviewNote('');
      startTransition(() => { router.refresh(); });
    } catch {
      setReviewError('Network error — could not reach the review endpoint.');
      setReviewState('error');
    }
  }

  return (
    <div className="space-y-4">
      <ContentAssetSummary workspace={workspace} />

      <GenerationControls
        itemId={itemId}
        hasVersions={hasVersions}
        genState={genState}
        genError={genError}
        onGenerate={handleGenerate}
      />

      <VersionViewer
        version={displayedVersion}
        onReview={handleReview}
        reviewState={reviewState}
        reviewError={reviewError}
        reviewNote={reviewNote}
        onNoteChange={note => { setReviewNote(note); setReviewState('idle'); }}
      />

      <VersionHistory
        versions={allVersions}
        selectedVersionId={selectedVersionId ?? displayedVersion?.id ?? null}
        onSelect={id => setSelectedVersionId(id === selectedVersionId ? null : id)}
      />

      <ReviewHistoryPanel history={workspace.review_history} />
    </div>
  );
}
