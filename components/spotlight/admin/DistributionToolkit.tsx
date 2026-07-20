'use client';
// components/spotlight/admin/DistributionToolkit.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The admin's centralized distribution interface. Supersedes ProfileSharingPanel.
//
// Two sections:
//   1. Quick Share — copy caption/link, native share, download card/QR
//   2. Distribution Checklist — per-channel mark/unmark with persistence
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useNativeShare }     from '@/hooks/spotlight/useNativeShare';
import { useCopyToClipboard } from '@/hooks/spotlight/useCopyToClipboard';
import type { ChannelDistributionStatus } from '@/lib/spotlight/types';

type DownloadState = 'idle' | 'loading' | 'done' | 'error';

async function downloadFromUrl(url: string, filename: string) {
  const res  = await fetch(url);
  const blob = await res.blob();
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const CHANNEL_TYPE_GUIDANCE: Record<string, string> = {
  whatsapp:  'Copy Caption → Copy Link → paste in chat. Use Download Card for Status.',
  telegram:  'Copy Link or use Native Share.',
  internal:  'Copy Link.',
  external:  'Copy Link or Download Card depending on platform.',
  api:       'Automation coming in a future phase.',
};

export default function DistributionToolkit({
  slug,
  submissionId,
  participantName,
  headline,
  profileUrl,
  cardDownloadUrl,
  qrUrl,
  sharingCaption,
  channels,
  initialLog,
}: {
  slug: string;
  submissionId: string;
  participantName: string;
  headline: string | null;
  profileUrl: string;
  cardDownloadUrl: string;
  qrUrl: string;
  sharingCaption: string | null;
  channels: ChannelDistributionStatus[];
  initialLog: import('@/lib/spotlight/types').DistributionLogEntry[];
}) {
  const { canShare, share }                          = useNativeShare();
  const { copied: copiedLink,    copy: copyLink    } = useCopyToClipboard();
  const { copied: copiedCaption, copy: copyCaption } = useCopyToClipboard();
  const [cardState,  setCardState]                   = useState<DownloadState>('idle');
  const [qrState,    setQrState]                     = useState<DownloadState>('idle');

  // Mutable distribution state — seeded from server, updated optimistically
  const [channelStates, setChannelStates] = useState<ChannelDistributionStatus[]>(channels);
  const [loadingChannel, setLoadingChannel] = useState<string | null>(null);

  async function handleDownloadCard() {
    setCardState('loading');
    try {
      await downloadFromUrl(cardDownloadUrl, `spotlight-${slug}.png`);
      setCardState('done'); setTimeout(() => setCardState('idle'), 2000);
    } catch { setCardState('error'); }
  }

  async function handleDownloadQR() {
    setQrState('loading');
    try {
      await downloadFromUrl(qrUrl, `spotlight-${slug}-qr.png`);
      setQrState('done'); setTimeout(() => setQrState('idle'), 2000);
    } catch { setQrState('error'); }
  }

  async function toggleChannel(channel: ChannelDistributionStatus) {
    setLoadingChannel(channel.id);

    const isCurrentlyDistributed = channel.is_distributed;
    const body = isCurrentlyDistributed
      ? { action: 'unmark', log_id: channel.log_entry!.id }
      : { action: 'mark',   channel_id: channel.id, channel_name: channel.channel_name };

    try {
      const res = await fetch(
        `/api/spotlight/admin/profiles/${submissionId}/distribution`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      );
      const data = await res.json() as { ok?: boolean; log_id?: string };

      if (res.ok) {
        setChannelStates(prev => prev.map(c => {
          if (c.id !== channel.id) return c;
          if (isCurrentlyDistributed) {
            return { ...c, is_distributed: false, log_entry: null };
          } else {
            return {
              ...c,
              is_distributed: true,
              log_entry: {
                id:             data.log_id ?? '',
                profile_id:     '',
                channel_id:     channel.id,
                channel_name:   channel.channel_name,
                marked_by_email: 'You',
                marked_at:      new Date().toISOString(),
              },
            };
          }
        }));
      }
    } catch { /* leave state unchanged on network error */ }
    setLoadingChannel(null);
  }

  const distributedCount = channelStates.filter(c => c.is_distributed).length;
  const totalChannels    = channelStates.length;

  return (
    <div className="space-y-4">

      {/* ── QUICK SHARE ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">Quick Share</p>

        {canShare && (
          <button
            onClick={() => share({ title: `${participantName} — Spotlight`, text: sharingCaption ?? undefined, url: profileUrl })}
            className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#C9A227] text-black font-black text-sm py-3 rounded-xl transition-colors mb-3"
          >
            ⬆ Native Share
          </button>
        )}

        <div className="grid grid-cols-2 gap-2 mb-2">
          <button onClick={() => copyLink(profileUrl)}
            className="text-xs font-bold bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 py-2.5 rounded-xl transition-colors">
            {copiedLink ? '✓ Copied' : '🔗 Copy Link'}
          </button>
          {sharingCaption && (
            <button onClick={() => copyCaption(sharingCaption)}
              className="text-xs font-bold bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 py-2.5 rounded-xl transition-colors">
              {copiedCaption ? '✓ Copied' : '💬 Copy Caption'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleDownloadCard} disabled={cardState === 'loading'}
            className="text-xs font-bold bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 py-2.5 rounded-xl transition-colors disabled:opacity-50">
            {cardState === 'loading' ? '⏳' : cardState === 'done' ? '✓ Saved' : '⬇ Download Card'}
          </button>
          <button onClick={handleDownloadQR} disabled={qrState === 'loading'}
            className="text-xs font-bold bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 py-2.5 rounded-xl transition-colors disabled:opacity-50">
            {qrState === 'loading' ? '⏳' : qrState === 'done' ? '✓ Saved' : '⬇ Download QR'}
          </button>
        </div>

        {/* Approved sharing caption preview */}
        {sharingCaption && (
          <div className="mt-3 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200">
            <p className="text-[0.6rem] font-black text-gray-400 uppercase tracking-wider mb-1">Approved Caption</p>
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{sharingCaption}</p>
          </div>
        )}
      </div>

      {/* ── DISTRIBUTION CHECKLIST ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider">
            Distribution Checklist
          </p>
          <span className="text-xs font-bold text-gray-400">
            {distributedCount}/{totalChannels + 3} complete
          </span>
        </div>

        {/* System-ready badges — always checked, not toggleable */}
        <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
          {[
            'Public Profile Published',
            'Spotlight Card Ready',
            'QR Code Ready',
          ].map(label => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <span className="text-[0.65rem] text-green-600 font-black">✓</span>
              </span>
              <span className="text-sm text-gray-600">{label}</span>
            </div>
          ))}
        </div>

        {/* Channel checklist */}
        {channelStates.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            No active distribution channels configured.
          </p>
        ) : (
          <div className="space-y-2">
            {channelStates.map(channel => {
              const isLoading = loadingChannel === channel.id;
              const isChecked = channel.is_distributed;
              const channelUrl = (channel.config as Record<string, string>)?.url;

              return (
                <div key={channel.id} className={`rounded-xl border transition-colors ${
                  isChecked ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-3 px-3 py-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleChannel(channel)}
                      disabled={isLoading || channel.channel_type === 'api'}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                        ${isChecked
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 bg-white hover:border-[#D4AF37]'}
                        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {isLoading ? (
                        <span className="text-[0.6rem]">…</span>
                      ) : isChecked ? (
                        <span className="text-[0.65rem] font-black">✓</span>
                      ) : null}
                    </button>

                    {/* Channel info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isChecked ? 'text-green-800' : 'text-gray-700'}`}>
                        {channel.channel_name}
                      </p>
                      {isChecked && channel.log_entry && (
                        <p className="text-[0.6rem] text-green-600 truncate">
                          Shared · {new Date(channel.log_entry.marked_at).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short',
                          })}
                        </p>
                      )}
                      {!isChecked && channel.channel_type === 'api' && (
                        <p className="text-[0.6rem] text-gray-400">Automation — future phase</p>
                      )}
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {sharingCaption && channel.channel_type !== 'api' && (
                        <CopyChannelButton text={sharingCaption} label="Caption" />
                      )}
                      {channelUrl && (
                        <a
                          href={channelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[0.65rem] font-bold text-gray-400 hover:text-gray-700 bg-white border border-gray-200 px-2 py-1 rounded-lg transition-colors"
                        >
                          Open ↗
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Guidance hint */}
                  {!isChecked && CHANNEL_TYPE_GUIDANCE[channel.channel_type] && (
                    <p className="text-[0.6rem] text-gray-400 px-3 pb-2 leading-relaxed">
                      {CHANNEL_TYPE_GUIDANCE[channel.channel_type]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Small inline helper — avoids a separate file for a one-use button
function CopyChannelButton({ text, label }: { text: string; label: string }) {
  const { copied, copy } = useCopyToClipboard(1500);
  return (
    <button
      onClick={() => copy(text)}
      className="text-[0.65rem] font-bold text-gray-400 hover:text-gray-700 bg-white border border-gray-200 px-2 py-1 rounded-lg transition-colors"
    >
      {copied ? '✓' : `Copy ${label}`}
    </button>
  );
}
