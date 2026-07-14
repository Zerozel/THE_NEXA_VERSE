// app/spotlight/admin/content/[id]/page.tsx — SERVER COMPONENT
// Full replacement of the Phase 5A static detail page.
// Loads the complete workspace dataset and hands it to the client orchestrator.
import { notFound }               from 'next/navigation';
import Link                       from 'next/link';
import { createAdminClient }      from '@/lib/supabase-server';
import { fetchContentWorkspace }  from '@/lib/spotlight/content';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_DESCRIPTIONS } from '@/lib/spotlight/contentTypes';
import GenerationWorkspace        from '@/components/spotlight/admin/GenerationWorkspace';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

export default async function ContentWorkspacePage({ params }: Params) {
  const db        = createAdminClient();
  const workspace = await fetchContentWorkspace(db, params.id);

  if (!workspace) notFound();

  const typeLabel = CONTENT_TYPE_LABELS[workspace.content_type as keyof typeof CONTENT_TYPE_LABELS]
    ?? workspace.content_type;
  const typeDesc  = CONTENT_TYPE_DESCRIPTIONS[workspace.content_type as keyof typeof CONTENT_TYPE_DESCRIPTIONS]
    ?? '';

  return (
    <div>
      {/* Back link */}
      <Link
        href="/spotlight/admin/content"
        className="text-gray-400 text-xs font-medium hover:text-gray-600 mb-4 inline-block"
      >
        ← Back to Content Queue
      </Link>

      {/* Page header — server-rendered, never changes within a visit */}
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
        {typeDesc && (
          <p className="text-gray-500 text-sm">{typeDesc}</p>
        )}
      </div>

      {/* All four interactive sections — client component */}
      <GenerationWorkspace
        workspace={workspace}
        itemId={params.id}
      />
    </div>
  );
}
