'use client';
// components/spotlight/share/ShareModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Participant-facing share modal. Mounted on the public profile page.
// Shows: Native Share (if supported), Copy Link, Copy Caption, Download Card,
// Download QR. No platform automation. No database writes.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useNativeShare }        from '@/hooks/spotlight/useNativeShare';
import { useCopyToClipboard }    from '@/hooks/spotlight/useCopyToClipboard';

type DownloadState = 'idle' | 'loading' | 'done' | 'error';

const PLATFORM_TIPS = [
  { platform: 'WhatsApp Chat',     icon: '💬', tip: 'Copy Caption → Copy Link → paste in chat' },
  { platform: 'WhatsApp Status',   icon: '📸', tip: 'Download Card → upload as Status image' },
  { platform: 'Instagram Story',   icon: '📷', tip: 'Download Card → share as Story' },
  { platform: 'Facebook / LinkedIn', icon: '🔗', tip: 'Copy Link — rich preview appears automatically' },
  { platform: 'Telegram',          icon: '✈️', tip: 'Use Native Share or Copy Link' },
  { platform: 'Poster / Print',    icon: '📌', tip: 'Download QR code — links directly to profile' },
];

async function downloadFromUrl(url: string, filename: string) {
  const res  = await fetch(url);
  const blob = await res.blob();
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ShareModal({
  slug,
  participantName,
  headline,
  profileUrl,
  cardDownloadUrl,
  qrUrl,
  sharingCaption,
  onClose,
}: {
  slug: string;
  participantName: string;
  headline: string | null;
  profileUrl: string;
  cardDownloadUrl: string;  // /api/spotlight/og/[slug]
  qrUrl: string;             // /api/spotlight/qr/[slug]
  sharingCaption: string | null;
  onClose: () => void;
}) {
  const { canShare, share }             = useNativeShare();
  const { copied: copiedLink,    copy: copyLink    } = useCopyToClipboard();
  const { copied: copiedCaption, copy: copyCaption } = useCopyToClipboard();
  const [cardState, setCardState]       = useState<DownloadState>('idle');
  const [qrState,   setQrState]         = useState<DownloadState>('idle');
  const [showTips,  setShowTips]        = useState(false);

  async function handleNativeShare() {
    await share({
      title: `${participantName} — Spotlight`,
      text:  sharingCaption ?? `Check out ${participantName}'s Spotlight`,
      url:   profileUrl,
    });
  }

  async function handleDownloadCard() {
    setCardState('loading');
    try {
      await downloadFromUrl(cardDownloadUrl, `spotlight-${slug}.png`);
      setCardState('done');
      setTimeout(() => setCardState('idle'), 2000);
    } catch { setCardState('error'); }
  }

  async function handleDownloadQR() {
    setQrState('loading');
    try {
      await downloadFromUrl(qrUrl, `spotlight-${slug}-qr.png`);
      setQrState('done');
      setTimeout(() => setQrState('idle'), 2000);
    } catch { setQrState('error'); }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-xs font-black text-[#D4AF37] uppercase tracking-widest mb-0.5">Share Spotlight</p>
            <p className="text-sm font-bold text-white">{participantName}</p>
            {headline && <p className="text-xs text-white/40 truncate">{headline}</p>}
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 text-xl transition-colors">✕</button>
        </div>

        <div className="px-5 pb-6 space-y-3">
          {/* Native Share — prominent on mobile */}
          {canShare && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#C9A227] text-black font-black text-sm py-3.5 rounded-2xl transition-colors"
            >
              <span>⬆</span> Share via…
            </button>
          )}

          {/* Copy actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => copyLink(profileUrl)}
              className="flex items-center justify-center gap-1.5 bg-white/8 hover:bg-white/12 border border-white/10 text-white text-xs font-bold py-3 rounded-2xl transition-colors"
            >
              {copiedLink ? '✓ Copied' : '🔗 Copy Link'}
            </button>

            {sharingCaption && (
              <button
                onClick={() => copyCaption(sharingCaption)}
                className="flex items-center justify-center gap-1.5 bg-white/8 hover:bg-white/12 border border-white/10 text-white text-xs font-bold py-3 rounded-2xl transition-colors"
              >
                {copiedCaption ? '✓ Copied' : '💬 Copy Caption'}
              </button>
            )}
          </div>

          {/* Downloads */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadCard}
              disabled={cardState === 'loading'}
              className="flex items-center justify-center gap-1.5 bg-white/8 hover:bg-white/12 border border-white/10 text-white text-xs font-bold py-3 rounded-2xl transition-colors disabled:opacity-50"
            >
              {cardState === 'loading' ? '⏳' : cardState === 'done' ? '✓ Saved' : '⬇ Card'}
            </button>
            <button
              onClick={handleDownloadQR}
              disabled={qrState === 'loading'}
              className="flex items-center justify-center gap-1.5 bg-white/8 hover:bg-white/12 border border-white/10 text-white text-xs font-bold py-3 rounded-2xl transition-colors disabled:opacity-50"
            >
              {qrState === 'loading' ? '⏳' : qrState === 'done' ? '✓ Saved' : '⬇ QR'}
            </button>
          </div>

          {/* Platform tips toggle */}
          <button
            onClick={() => setShowTips(t => !t)}
            className="w-full text-center text-xs text-white/30 hover:text-white/60 transition-colors py-1"
          >
            {showTips ? '▲ Hide platform tips' : '▾ Where should I share this?'}
          </button>

          {showTips && (
            <div className="space-y-2 bg-white/5 rounded-2xl p-3">
              {PLATFORM_TIPS.map(t => (
                <div key={t.platform} className="flex gap-2 items-start">
                  <span className="text-base shrink-0">{t.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-white/80">{t.platform}</p>
                    <p className="text-[0.65rem] text-white/40 leading-relaxed">{t.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
