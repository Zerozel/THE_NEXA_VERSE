// app/spotlight/admin/profiles/[submissionId]/page.tsx — SERVER COMPONENT
import { notFound }                   from 'next/navigation';
import Link                           from 'next/link';
import { createAdminClient }          from '@/lib/supabase-server';
import { getAdminProfileBySubmission } from '@/lib/spotlight/profiles';
import { CONTENT_STATUS_LABELS }      from '@/lib/spotlight/contentTypes';
import ProfilePublishPanel            from '@/components/spotlight/admin/ProfilePublishPanel';
import { getPublicProfile }           from '@/lib/spotlight/profiles';
import { getProfileUrl, getCardUrl, getOgImageUrl, getQrUrl } from '@/lib/spotlight/sharing';
import { getActiveChannels, getDistributionLog, buildChannelDistributionStatus } from '@/lib/spotlight/distribution';
import DistributionToolkit from '@/components/spotlight/admin/DistributionToolkit';

export const dynamic = 'force-dynamic';

type Params = { params: { submissionId: string } };

export default async function AdminProfileManagementPage({ params }: Params) {
  const db      = createAdminClient();
  const profile = await getAdminProfileBySubmission(db, params.submissionId);

  if (!profile) notFound();

  // Sharing data — only computed when the profile has a published slug
  let profileUrl:        string | null = null;
  let cardUrl:           string | null = null;
  let cardDownloadUrl:   string | null = null;
  let qrUrl:             string | null = null;
  let channelStatuses:   ReturnType<typeof buildChannelDistributionStatus> = [];
  let sharingCaption:    string | null = null;
  let distributionLog:   Awaited<ReturnType<typeof getDistributionLog>> = [];

  if (profile.is_public && profile.slug) {
    const [publicProfileData, channels, profileRow] = await Promise.all([
      getPublicProfile(db, profile.slug),
      getActiveChannels(db),
      db.from('spotlight_profiles').select('id').eq('submission_id', params.submissionId).maybeSingle(),
    ]);

    const log = profileRow?.data?.id
      ? await getDistributionLog(db, profileRow.data.id)
      : [];

    profileUrl        = getProfileUrl(profile.slug);
    cardUrl           = getCardUrl(profile.slug);
    cardDownloadUrl   = getOgImageUrl(profile.slug);
    qrUrl             = getQrUrl(profile.slug);
    channelStatuses   = buildChannelDistributionStatus(channels, log);
    sharingCaption    = publicProfileData?.sharing_caption ?? null;
    distributionLog   = log;
  }

  return (
    <div>
      <Link
        href="/spotlight/admin/profiles"
        className="text-gray-400 text-xs font-medium hover:text-gray-600 mb-4 inline-block"
      >
        ← Back to Profiles
      </Link>

      {/* Header */}
      <div className="mb-5">
        <p className="text-[0.7rem] font-black text-[#D4AF37] uppercase tracking-widest mb-1">
          {profile.category || 'Profile'}
        </p>
        <h1
          className="text-xl font-black text-gray-900"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {profile.participant_name || 'Unnamed Applicant'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Submitted {profile.submitted_at
            ? new Date(profile.submitted_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })
            : '—'}
          {profile.approved_at && (
            <> · Approved {new Date(profile.approved_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}</>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: publish controls */}
        <ProfilePublishPanel profile={profile} />

        {/* Right: submission info */}
        <div className="space-y-4">
          {/* Submission status */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
              Submission
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[0.62rem] font-black text-gray-400 uppercase tracking-wider mb-0.5">Status</p>
                <p className="text-sm text-gray-800 capitalize">{profile.submission_status}</p>
              </div>
              <div>
                <p className="text-[0.62rem] font-black text-gray-400 uppercase tracking-wider mb-0.5">Category</p>
                <p className="text-sm text-gray-800">{profile.category || '—'}</p>
              </div>
            </div>

            {/* Link to submission review */}
            <Link
              href={`/spotlight/admin/submissions/${profile.submission_id}`}
              className="inline-block mt-4 text-xs font-bold text-[#D4AF37] hover:underline"
            >
              View Submission & Review History →
            </Link>
          </div>

          {/* Content items detail */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
              Content Assets
            </p>
            <div className="space-y-2">
              {profile.content_items.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <Link
                    href={`/spotlight/admin/content/${item.id}`}
                    className="text-sm text-gray-700 hover:text-[#D4AF37] transition-colors"
                  >
                    {({
                      spotlight_intro:    'Introduction',
                      founder_story:      'Their Story',
                      service_highlight:  'What They Do',
                      community_question: 'Community Question',
                      whatsapp_short:     'WhatsApp Short',
                      channel_long:       'Channel Long',
                    })[item.format] ?? item.format}
                  </Link>
                  <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full border ${
                    item.has_approved_version
                      ? 'text-green-700 bg-green-50 border-green-200'
                      : item.status === 'generated'
                        ? 'text-blue-700 bg-blue-50 border-blue-200'
                        : 'text-gray-500 bg-gray-50 border-gray-200'
                  }`}>
                    {item.has_approved_version
                      ? '✓ Approved'
                      : CONTENT_STATUS_LABELS[item.status as keyof typeof CONTENT_STATUS_LABELS] ?? item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Toolkit — only shown when published */}
      {profile.is_public && profile.slug && profileUrl && cardDownloadUrl && qrUrl && (
        <div className="mt-4">
          <DistributionToolkit
            slug={profile.slug}
            submissionId={params.submissionId}
            participantName={profile.participant_name ?? 'Participant'}
            headline={null}
            profileUrl={profileUrl}
            cardDownloadUrl={cardDownloadUrl}
            qrUrl={qrUrl}
            sharingCaption={sharingCaption}
            channels={channelStatuses}
            initialLog={distributionLog}
          />
        </div>
      )}
    </div>
  );
}
