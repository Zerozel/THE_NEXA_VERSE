'use client';
// components/spotlight/admin/GenerationWorkspace.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CLIENT COMPONENT. Owns all interactive state for the generation workspace:
// - generation trigger + loading / success / error feedback
// - selected version (for version history navigation)
// - immediate display of newly generated content before router.refresh() completes
//
// Receives `workspace` from the Server Component page. After each successful
// generation, router.refresh() re-runs the server loader and passes fresh
// props — no manual cache invalidation, no client-side data fetching.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_DESCRIPTIONS,
  CONTENT_STATUS_LABELS,
} from '@/lib/spotlight/contentTypes';
import type { ContentWorkspaceDetail, ContentVersion, GenerationResult } from '@/lib/spotlight/types';

// ── ERROR MESSAGE MAP ──────────────────────────────────────────────────────
const GEN_ERROR_MESSAGES: Record<string, string> = {
  missing_content_item:
    'Content item not found. It may have been deleted.',
  missing_submission:
    'The submission for this content no longer exists.',
  invalid_content_type:
    'This content type is not recognised by the generation engine.',
  invalid_prompt:
    'Could not build a generation prompt. Ensure the submission has complete questionnaire responses.',
  provider_failure:
    'The AI provider returned an error. Verify GEMINI_API_KEY is set correctly and try again.',
  generation_timeout:
    'Generation timed out after 30 seconds. The provider may be under load — try again shortly.',
};

// ── SMALL HELPERS ──────────────────────────────────────────────────────────
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

// ── SUB-COMPONENTS (unexported, file-private) ──────────────────────────────

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[0.62rem] font-black text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value ?? '—'}</p>
    </div>
  );
}

function MetaBadge({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[0.62rem] font-black text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-[0.7rem] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{value}</span>
    </div>
  );
}

// ── SECTION 1: CONTENT ASSET SUMMARY ──────────────────────────────────────

function ContentAssetSummary({ workspace }: { workspace: ContentWorkspaceDetail }) {
  const typeLabel   = CONTENT_TYPE_LABELS[workspace.content_type as keyof typeof CONTENT_TYPE_LABELS]   ?? workspace.content_type;
  const statusLabel = CONTENT_STATUS_LABELS[workspace.content_status as keyof typeof CONTENT_STATUS_LABELS] ?? workspace.content_status;

  const statusColor =
    workspace.content_status === 'generated'        ? 'text-green-700 bg-green-50 border-green-200' :
    workspace.content_status === 'pending_generation' ? 'text-blue-700 bg-blue-50 border-blue-200' :
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
        <MetaRow label="Content Type"  value={typeLabel} />
        <MetaRow label="Participant"   value={workspace.participant_name ?? 'Unknown'} />
        <MetaRow label="Category"      value={workspace.category} />
        <MetaRow
          label="Submitted"
          value={workspace.submitted_at
            ? new Date(workspace.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : null}
        />
        <MetaRow
          label="Last Generated"
          value={workspace.last_generated_at ? formatDatetime(workspace.last_generated_at) : null}
        />
        <MetaRow
          label="Versions"
          value={
            workspace.generation_count > 0
              ? `${workspace.generation_count} version${workspace.generation_count === 1 ? '' : 's'}`
              : 'None yet'
          }
        />
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
      <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-4">
        Generation Controls
      </h2>

      <div className="flex flex-col gap-3">
        {!hasVersions ? (
          // First-time generation
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-full bg-[#D4AF37] hover:bg-[#C9A227] disabled:opacity-60 disabled:cursor-not-allowed
                       text-black font-black text-sm py-3.5 px-5 rounded-xl transition-colors"
          >
            {isGenerating ? '⏳  Generating…' : '✦  Generate Content'}
          </button>
        ) : (
          // Regeneration — same endpoint, different label
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-full bg-gray-900 hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed
                       text-white font-black text-sm py-3.5 px-5 rounded-xl transition-colors"
          >
            {isGenerating ? '⏳  Generating…' : '↺  Regenerate Content'}
          </button>
        )}

        {/* Feedback states */}
        {genState === 'generating' && (
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
            <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-[#D4AF37] rounded-full animate-spin" />
            Calling Gemini 2.5 Flash — this usually takes 2–5 seconds…
          </div>
        )}

        {genState === 'success' && (
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            ✓  Content generated successfully. New version created.
          </div>
        )}

        {genState === 'error' && genError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="font-black mb-1">Generation Failed</p>
            <p className="leading-relaxed">{genError}</p>
          </div>
        )}
      </div>

      <p className="text-[0.7rem] text-gray-400 mt-4 leading-relaxed">
        {hasVersions
          ? 'Regenerating creates a new version. All previous versions are preserved and remain viewable below.'
          : 'Generating calls the Gemini provider with the participant\'s questionnaire responses. No edits or publishing are performed here.'}
      </p>
    </div>
  );
}

// ── SECTION 3: VERSION VIEWER ──────────────────────────────────────────────

function VersionViewer({ version }: { version: ContentVersion | null }) {
  if (!version) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <p className="text-4xl mb-3">✍️</p>
        <p className="font-black text-gray-700 text-sm mb-1">Awaiting Generation</p>
        <p className="text-gray-400 text-xs max-w-xs mx-auto leading-relaxed">
          No content has been generated yet for this asset.
          Use the Generation Controls above to create the first version.
        </p>
      </div>
    );
  }

  const meta = version.generation_metadata;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      {/* Version header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider">
          Version {version.version_number}
        </h2>
        <div className="flex items-center gap-2">
          {meta && (
            <>
              <MetaBadge label="" value={meta.provider} />
              <MetaBadge label="" value={meta.model} />
              <MetaBadge label="prompt" value={meta.prompt_version} />
            </>
          )}
        </div>
      </div>

      {/* Generated content — read-only, formatting preserved */}
      <div
        className="bg-gray-50 rounded-xl p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap
                   font-[inherit] min-h-[120px] max-h-[420px] overflow-y-auto border border-gray-100"
      >
        {version.body || <span className="text-gray-400 italic">No content body.</span>}
      </div>

      {/* Metadata row */}
      {meta && (
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3">
          <MetaRow
            label="Generated At"
            value={formatDatetime(meta.generated_at)}
          />
          <MetaRow
            label="Duration"
            value={formatDuration(meta.generation_duration_ms)}
          />
          <MetaRow
            label="Prompt Version"
            value={meta.prompt_version}
          />
        </div>
      )}
    </div>
  );
}

// ── SECTION 4: VERSION HISTORY ─────────────────────────────────────────────

function VersionHistory({
  versions,
  selectedVersionId,
  onSelect,
}: {
  versions: ContentVersion[];
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
        {versions.map((v) => {
          const isSelected = v.id === selectedVersionId;
          const meta = v.generation_metadata;

          return (
            <button
              key={v.id}
              onClick={() => onSelect(v.id)}
              className={`w-full text-left rounded-xl px-4 py-3 border transition-colors
                ${isSelected
                  ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40'
                  : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black ${isSelected ? 'text-[#C9A227]' : 'text-gray-700'}`}>
                    v{v.version_number}
                  </span>
                  {meta && (
                    <span className="text-[0.68rem] font-bold text-gray-400">
                      {meta.provider} · {meta.model}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[0.68rem] text-gray-400">
                    {new Date(v.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                  {meta && (
                    <p className="text-[0.65rem] text-gray-400">
                      {formatDuration(meta.generation_duration_ms)} · prompt {meta.prompt_version}
                    </p>
                  )}
                </div>
              </div>
              {/* Body preview */}
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
  const [genState, setGenState]         = useState<GenState>('idle');
  const [genError, setGenError]         = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<GenerationResult | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // ── Immediate result handling ──────────────────────────────────────────
  // latestResult is set right after the API responds, before router.refresh()
  // completes. Once workspace.all_versions includes the new version (post-
  // refresh), latestResult is redundant and we fall back to props data.
  const immediateVersion: ContentVersion | null =
    latestResult && !workspace.all_versions.some(v => v.id === latestResult.version_id)
      ? {
          id: latestResult.version_id,
          content_item_id: latestResult.content_item_id,
          version_number: latestResult.version_number,
          body: latestResult.body,
          is_generated: true,
          generation_metadata: latestResult.metadata,
          created_at: new Date().toISOString(),
        }
      : null;

  // Merge immediate result into version lists (before server refresh arrives)
  const allVersions: ContentVersion[] =
    immediateVersion && !workspace.all_versions.some(v => v.id === immediateVersion.id)
      ? [immediateVersion, ...workspace.all_versions]
      : workspace.all_versions;

  const latestVersion: ContentVersion | null = allVersions[0] ?? null;

  // Which version the viewer shows:
  // 1. admin explicitly selected one → show that
  // 2. immediate result just generated → show it (before refresh)
  // 3. default → latest from props
  const displayedVersion: ContentVersion | null =
    selectedVersionId
      ? allVersions.find(v => v.id === selectedVersionId) ?? latestVersion
      : (immediateVersion ?? latestVersion);

  const hasVersions = allVersions.length > 0;

  // ── Generation handler ─────────────────────────────────────────────────
  async function handleGenerate() {
    setGenState('generating');
    setGenError(null);
    setSelectedVersionId(null); // auto-show the new version in viewer

    try {
      const res = await fetch(`/api/spotlight/admin/content/${itemId}/generate`, {
        method: 'POST',
      });

      const data = await res.json() as {
        ok?: boolean;
        result?: GenerationResult;
        error?: string;
        code?: string;
      };

      if (!res.ok) {
        const msg =
          GEN_ERROR_MESSAGES[data.code ?? ''] ??
          data.error ??
          'Generation failed unexpectedly. Check server logs.';
        setGenError(msg);
        setGenState('error');
        return;
      }

      if (data.result) {
        setLatestResult(data.result);
      }
      setGenState('success');

      // Refresh server data in background — non-blocking via useTransition
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setGenError('Network error — could not reach the generation endpoint. Check your connection.');
      setGenState('error');
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

      <VersionViewer version={displayedVersion} />

      <VersionHistory
        versions={allVersions}
        selectedVersionId={selectedVersionId ?? (displayedVersion?.id ?? null)}
        onSelect={(id) => {
          // If admin clicks the already-displayed version, deselect back to latest
          if (id === selectedVersionId) {
            setSelectedVersionId(null);
          } else {
            setSelectedVersionId(id);
          }
        }}
      />
    </div>
  );
}
