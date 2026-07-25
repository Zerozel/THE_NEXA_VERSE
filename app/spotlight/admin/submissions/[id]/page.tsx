// app/spotlight/admin/submissions/[id]/page.tsx
// REPLACE YOUR EXISTING FILE WITH THIS COMPLETE VERSION
// Adds: content items status block + post-approval next-step guidance

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase-server';
import { getSubmissionDetail } from '@/lib/spotlight/adminReview';
import StatusBadge from '@/components/spotlight/admin/StatusBadge';
import ReviewHistory from '@/components/spotlight/admin/ReviewHistory';
import ReviewActionPanel from '@/components/spotlight/admin/ReviewActionPanel';
import SubmissionReviewCard from '@/components/spotlight/admin/SubmissionReviewCard';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

const FORMAT_LABELS: Record<string, string> = {
  spotlight_intro: 'Introduction',
  founder_story: 'Their Story',
  service_highlight: 'What They Do',
  community_question: 'Community Question',
  whatsapp_short: 'WhatsApp Short',
  channel_long: 'Channel Long',
};

const STATUS_COLORS: Record<string, string> = {
  pending_generation: 'bg-gray-100 text-gray-500',
  generated: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  needs_revision: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-600',
};

export default async function SubmissionDetailPage({ params }: Params) {
  const db = createAdminClient();
  const detail = await getSubmissionDetail(db, params.id);

  if (!detail) notFound();

  // Load content items for this submission
  const { data: contentItems } = await db
    .from('spotlight_content_items')
    .select('id, format, status, approved_version_id')
    .eq('submission_id', params.id)
    .order('format');

  const items = contentItems ?? [];
  const approvedCount = items.filter((i) => i.approved_version_id !== null).length;
  const totalCount = items.length;
  const allApproved = totalCount === 6 && approvedCount === 6;
  const isApproved = detail.status === 'approved' || detail.status === 'published';
  const contentExists = totalCount > 0;

  return (
    <div>
      <Link
        href="/spotlight/admin/submissions"
        className="text-gray-400 text-xs font-medium hover:text-gray-600 mb-4 inline-block"
      >
        ← Back to Review Queue
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1
            className="text-xl font-black text-gray-900"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {detail.participant_name || 'Unnamed Applicant'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{detail.email || '—'}</p>
        </div>
        <StatusBadge status={detail.status} />
      </div>

      {/* ── NEXT STEP GUIDANCE (shown when approved) ───────────────────── */}
      {isApproved && (
        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl p-5 mb-5">
          {allApproved ? (
            <>
              <p className="text-sm font-black text-gray-800 mb-1">
                ✓ All 6 content items approved — ready to publish
              </p>
              <p className="text-xs text-gray-500 mb-3">
                This Spotlight is ready to go live as a public profile.
              </p>
              <Link
                href={`/spotlight/admin/profiles/${params.id}`}
                className="inline-block bg-[#D4AF37] text-black font-black text-sm
                           px-5 py-2.5 rounded-xl hover:bg-[#C9A227] transition-colors"
              >
                Publish Profile →
              </Link>
            </>
          ) : contentExists ? (
            <>
              <p className="text-sm font-black text-gray-800 mb-1">
                ✓ Approved — {approvedCount}/{totalCount} content items ready
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Generate and approve all 6 content items, then publish the
                profile.
              </p>
              <Link
                href={`/spotlight/admin/content?search=${encodeURIComponent(
                  detail.participant_name ?? ''
                )}`}
                className="inline-block bg-[#D4AF37] text-black font-black text-sm
                           px-5 py-2.5 rounded-xl hover:bg-[#C9A227] transition-colors"
              >
                Generate AI Content →
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm font-black text-gray-800 mb-1">
                ✓ Approved — content assets being created
              </p>
              <p className="text-xs text-gray-500 mb-3">
                6 content items are queued for AI generation.
              </p>
              <Link
                href="/spotlight/admin/content"
                className="inline-block bg-[#D4AF37] text-black font-black text-sm
                           px-5 py-2.5 rounded-xl hover:bg-[#C9A227] transition-colors"
              >
                Open Content Queue →
              </Link>
            </>
          )}
        </div>
      )}

      {/* ── CONTENT ITEMS STATUS (shown when items exist) ──────────────── */}
      {contentExists && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider">
              Content Assets
            </p>
            <span className="text-xs font-bold text-gray-500">
              {approvedCount}/{totalCount} approved
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-[#D4AF37] rounded-full transition-all"
              style={{
                width: `${
                  totalCount > 0 ? (approvedCount / totalCount) * 100 : 0
                }%`,
              }}
            />
          </div>

          <div className="space-y-2">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/spotlight/admin/content/${item.id}`}
                className="flex items-center justify-between hover:bg-gray-50
                           rounded-xl px-3 py-2 transition-colors"
              >
                <span className="text-sm text-gray-700">
                  {FORMAT_LABELS[item.format] ?? item.format}
                </span>
                <span
                  className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full
                  ${STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-500'}`}
                >
                  {item.approved_version_id
                    ? '✓ Approved'
                    : item.status.replace(/_/g, ' ')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── SUBMISSION REVIEW CARD ─────────────────────────────────────── */}
      {/* FIX: groups is an array - render first group or map through all */}
      {detail.groups && detail.groups.length > 0 && (
        <SubmissionReviewCard group={detail.groups[0]} />
      )}

      {/* ── REVIEW ACTION PANEL (only for pending/submitted) ──────────── */}
      {(detail.status === 'submitted' || detail.status === 'under_review') && (
        <ReviewActionPanel 
          submissionId={params.id} 
          currentStatus={detail.status}
        />
      )}

      {/* ── REVIEW HISTORY ────────────────────────────────────────────── */}
      <ReviewHistory logs={detail.review_logs ?? []} />
    </div>
  );
}
