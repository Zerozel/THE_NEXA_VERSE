'use client';
// components/spotlight/admin/ProfilePublishPanel.tsx
// Publish / unpublish controls for the admin profile management page.
// Client component — handles the action API call and router refresh.
import { useState, useTransition } from 'react';
import { useRouter }               from 'next/navigation';
import type { AdminProfileView }   from '@/lib/spotlight/types';

type PanelState = 'idle' | 'loading' | 'error';

const CONTENT_FORMAT_LABELS: Record<string, string> = {
  spotlight_intro:    'Introduction',
  founder_story:      'Their Story',
  service_highlight:  'What They Do',
  community_question: 'Community Question',
  whatsapp_short:     'WhatsApp Short',
  channel_long:       'Channel Long',
};

export default function ProfilePublishPanel({
  profile,
}: {
  profile: AdminProfileView;
}) {
  const router                       = useRouter();
  const [, startTransition]         = useTransition();
  const [state, setState]           = useState<PanelState>('idle');
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const isPublished = profile.is_public;
  const slug        = profile.slug;
  const publicUrl   = slug ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/spotlight/${slug}` : null;

  async function handleAction(action: 'publish' | 'unpublish') {
    setState('loading');
    setErrorMsg(null);

    try {
      const res = await fetch(
        `/api/spotlight/admin/profiles/${profile.submission_id}/${action}`,
        { method: 'POST' },
      );
      const data = await res.json() as { ok?: boolean; error?: string; code?: string; slug?: string };

      if (!res.ok) {
        const knownMessages: Record<string, string> = {
          already_published:         'This profile is already published.',
          already_unpublished:        'This profile is already unpublished.',
          invalid_submission_status:  'Only approved submissions can be published.',
          missing_submission:          'Submission not found.',
          missing_profile:             'Profile not found.',
        };
        setErrorMsg(knownMessages[data.code ?? ''] ?? data.error ?? 'Action failed.');
        setState('error');
        return;
      }

      setState('idle');
      startTransition(() => { router.refresh(); });
    } catch {
      setErrorMsg('Network error — could not reach the server.');
      setState('error');
    }
  }

  async function copyLink() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  const isLoading = state === 'loading';

  return (
    <div className="space-y-4">

      {/* Content readiness */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
          Content Readiness
        </p>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D4AF37] rounded-full transition-all"
              style={{ width: `${profile.total_content_count > 0 ? (profile.approved_content_count / profile.total_content_count) * 100 : 0}%` }}
            />
          </div>
          <span className="text-sm font-bold text-gray-700 shrink-0">
            {profile.approved_content_count} / {profile.total_content_count} approved
          </span>
        </div>

        <div className="space-y-2">
          {profile.content_items.map(item => (
            <div key={item.id} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {CONTENT_FORMAT_LABELS[item.format] ?? item.format}
              </span>
              <span className={`text-[0.7rem] font-bold px-2 py-0.5 rounded-full ${
                item.has_approved_version
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {item.has_approved_version ? '✓ Approved' : item.status}
              </span>
            </div>
          ))}
        </div>

        {profile.approved_content_count < profile.total_content_count && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-3">
            Not all content is approved yet. You can still publish — only approved sections will appear on the profile.
          </p>
        )}
      </div>

      {/* Publication status */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
          Publication Status
        </p>

        {isPublished && slug ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <span className="text-sm font-bold text-green-700">Published</span>
              {profile.published_at && (
                <span className="text-xs text-gray-400">
                  · {new Date(profile.published_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
              )}
            </div>

            {profile.published_by_email && (
              <p className="text-xs text-gray-400">Published by {profile.published_by_email}</p>
            )}

            {/* Public URL */}
            <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2 border border-gray-200">
              <span className="text-xs text-gray-600 truncate flex-1 font-mono">/spotlight/{slug}</span>
              <button
                onClick={copyLink}
                className="text-xs font-bold text-[#D4AF37] shrink-0"
              >
                {copiedLink ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            {/* View + Unpublish */}
            <div className="flex gap-2">
              <a
                href={`/spotlight/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl transition-colors"
              >
                View Profile →
              </a>
              <button
                onClick={() => handleAction('unpublish')}
                disabled={isLoading}
                className="flex-1 text-sm font-bold bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Working…' : 'Unpublish'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
              <span className="text-sm font-bold text-gray-500">
                {profile.profile_id ? 'Unpublished' : 'Not yet published'}
              </span>
            </div>
            <button
              onClick={() => handleAction('publish')}
              disabled={isLoading}
              className="w-full bg-[#D4AF37] hover:bg-[#C9A227] disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-sm py-3.5 rounded-xl transition-colors"
            >
              {isLoading ? '⏳ Publishing…' : '✦ Publish Profile'}
            </button>
          </div>
        )}

        {state === 'error' && errorMsg && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-2">
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}
