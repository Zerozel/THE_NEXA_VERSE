// app/spotlight/admin/submissions/[id]/page.tsx — SERVER COMPONENT
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-server';
import { getSubmissionDetail } from '@/lib/spotlight/adminReview';
import StatusBadge          from '@/components/spotlight/admin/StatusBadge';
import SubmissionReviewCard from '@/components/spotlight/admin/SubmissionReviewCard';
import ReviewActionPanel    from '@/components/spotlight/admin/ReviewActionPanel';
import ReviewHistory        from '@/components/spotlight/admin/ReviewHistory';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

export default async function SubmissionDetailPage({ params }: Params) {
  const db     = createAdminClient();
  const detail = await getSubmissionDetail(db, params.id);

  if (!detail) notFound();

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900" style={{ fontFamily: 'var(--font-headline)' }}>
            {detail.participant_name || 'Unnamed Applicant'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {detail.category || 'No category'}
            {detail.submitted_at && (
              <> \u00b7 Submitted {new Date(detail.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</>
            )}
          </p>
        </div>
        <StatusBadge status={detail.status} />
      </div>

      {/* Contact + agreement quick facts */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[0.65rem] font-black text-gray-400 uppercase tracking-wider mb-1">Email</p>
          <p className="text-sm text-gray-800 break-all">{detail.email || '\u2014'}</p>
        </div>
        <div>
          <p className="text-[0.65rem] font-black text-gray-400 uppercase tracking-wider mb-1">Agreement</p>
          <p className="text-sm text-gray-800">
            {detail.agreement_accepted_at
              ? `Accepted ${detail.agreement_version ?? ''} on ${new Date(detail.agreement_accepted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : 'Not recorded'}
          </p>
        </div>
        {detail.skills.length > 0 && (
          <div className="col-span-2">
            <p className="text-[0.65rem] font-black text-gray-400 uppercase tracking-wider mb-1.5">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {detail.skills.map(s => (
                <span key={s} className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rejection reason, if applicable */}
      {detail.status === 'rejected' && detail.rejection_reason && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-4">
          <p className="text-[0.65rem] font-black text-red-400 uppercase tracking-wider mb-1">
            Rejection Reason
          </p>
          <p className="text-sm text-red-700">{detail.rejection_reason}</p>
        </div>
      )}

      {/* Submission timeline (all events, including internal-only) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">
          Submission Timeline
        </p>
        <div className="space-y-3">
          {detail.timeline_events.map((ev, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37] mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-gray-800">
                  {ev.event_label}
                  {!ev.is_public && (
                    <span className="ml-2 text-[0.6rem] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-bold uppercase">
                      Internal
                    </span>
                  )}
                </p>
                {ev.event_description && (
                  <p className="text-gray-500 text-xs mt-0.5">{ev.event_description}</p>
                )}
                <p className="text-gray-400 text-[0.7rem] mt-0.5">
                  {new Date(ev.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' \u00b7 '}
                  {new Date(ev.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Review action panel */}
      <div className="mb-4">
        <ReviewActionPanel submissionId={detail.id} currentStatus={detail.status} />
      </div>

      {/* Full questionnaire answers, grouped by section */}
      {detail.groups.map((g, i) => (
        <SubmissionReviewCard key={i} group={g} />
      ))}

      {/* Review history */}
      <div className="mb-4">
        <ReviewHistory logs={detail.review_logs} />
      </div>
    </div>
  );
}
