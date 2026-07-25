// app/spotlight/admin/content/[id]/page.tsx
// REPLACE YOUR EXISTING FILE WITH THIS COMPLETE VERSION
// Adds: "Publish Profile" link when content exists, back-link to submission

import { notFound }                from 'next/navigation';
import Link                        from 'next/link';
import { createAdminClient }       from '@/lib/supabase-server';
import { fetchContentWorkspace }   from '@/lib/spotlight/content';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_DESCRIPTIONS,
} from '@/lib/spotlight/contentTypes';
import GenerationWorkspace         from '@/components/spotlight/admin/GenerationWorkspace';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

export default async function ContentWorkspacePage({ params }: Params) {
  const db        = createAdminClient();
  const workspace = await fetchContentWorkspace(db, params.id);

  if (!workspace) notFound();

  // Check how many of this submission's 6 items are approved
  const { data: allItems } = await db
    .from('spotlight_content_items')
    .select('id, approved_version_id')
    .eq('submission_id', workspace.submission_id);

  const totalItems    = allItems?.length ?? 0;
  const approvedItems = allItems?.filter(i => i.approved_version_id !== null).length ?? 0;
  const allApproved   = totalItems === 6 && approvedItems === 6;

  const typeLabel = CONTENT_TYPE_LABELS[
    workspace.content_type as keyof typeof CONTENT_TYPE_LABELS
  ] ?? workspace.content_type;

  const typeDesc = CONTENT_TYPE_DESCRIPTIONS[
    workspace.content_type as keyof typeof CONTENT_TYPE_DESCRIPTIONS
  ] ?? '';

  return (
    <div>
      {/* ── BREADCRUMBS ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs mb-4">
        <Link href="/spotlight/admin/content"
          className="text-gray-400 hover:text-gray-600">
          Content Queue
        </Link>
        <span className="text-gray-300">›</span>
        <Link
          href={`/spotlight/admin/submissions/${workspace.submission_id}`}
          className="text-gray-400 hover:text-gray-600"
        >
          {workspace.participant_name ?? 'Submission'}
        </Link>
        <span className="text-gray-300">›</span>
        <span className="text-gray-600 font-medium">{typeLabel}</span>
      </div>

      {/* ── READY TO PUBLISH BANNER ───────────────────────────────────── */}
      {allApproved && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-5
                        flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-green-800 mb-0.5">
              ✓ All 6 content items approved
            </p>
            <p className="text-xs text-green-600">
              This Spotlight is ready to be published as a public profile.
            </p>
          </div>
          <Link
            href={`/spotlight/admin/profiles/${workspace.submission_id}`}
            className="shrink-0 bg-green-600 hover:bg-green-700 text-white font-black
                       text-xs px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
          >
            Publish Profile →
          </Link>
        </div>
      )}

      {/* Content type header */}
      <div className="mb-5">
        <p className="text-[0.7rem] font-black text-[#D4AF37] uppercase tracking-widest mb-1">
          {typeLabel}
        </p>
        <h1
          className="text-xl font-black text-gray-900 mb-1"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {workspace.participant_name || 'Unnamed Applicant'}
        </h1>
        {typeDesc && <p className="text-gray-500 text-sm">{typeDesc}</p>}

        {/* Progress indicator */}
        {totalItems > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            {approvedItems}/{totalItems} content items approved for this submission
          </p>
        )}
      </div>

      {/* ── GENERATION WORKSPACE (all 4 sections) ────────────────────── */}
      <GenerationWorkspace workspace={workspace} itemId={params.id} />

      {/* ── BOTTOM NAV ────────────────────────────────────────────────── */}
      <div className="mt-6 pt-5 border-t border-gray-100 flex items-center
                      justify-between gap-3">
        <Link
          href={`/spotlight/admin/submissions/${workspace.submission_id}`}
          className="text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors"
        >
          ← Back to Submission
        </Link>
        <Link
          href={`/spotlight/admin/profiles/${workspace.submission_id}`}
          className="text-xs font-semibold text-[#D4AF37] hover:text-[#C9A227] transition-colors"
        >
          Profile Management →
        </Link>
      </div>
    </div>
  );
}
