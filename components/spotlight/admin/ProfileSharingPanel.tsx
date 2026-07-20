'use client';
// components/spotlight/admin/ProfileSharingPanel.tsx
// Sharing utilities for the admin profile management page.
// Receives pre-computed URLs and QR data from the server — no API calls here.
import { useState } from 'react';

type CopyState = 'idle' | 'copied';

function CopyRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const [copyState, setCopyState] = useState<CopyState>('idle');

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopyState('copied');
    setTimeout(() => setCopyState('idle'), 2000);
  }

  return (
    <div>
      <p className="text-[0.62rem] font-black text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
        <span className="text-xs text-gray-600 font-mono truncate flex-1">{value}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors"
            >
              ↗
            </a>
          )}
          <button
            onClick={copy}
            className="text-xs font-bold text-[#D4AF37] hover:text-[#C9A227] transition-colors"
          >
            {copyState === 'copied' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfileSharingPanel({
  slug,
  profileUrl,
  cardUrl,
  whatsAppShareUrl,
  qrDataUrl,
}: {
  slug: string;
  profileUrl: string;
  cardUrl: string;
  whatsAppShareUrl: string | null;
  qrDataUrl: string;
}) {
  const [qrDownloaded, setQrDownloaded] = useState(false);

  function downloadQR() {
    const a       = document.createElement('a');
    a.href        = qrDataUrl;
    a.download    = `spotlight-${slug}-qr.png`;
    a.click();
    setQrDownloaded(true);
    setTimeout(() => setQrDownloaded(false), 2000);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Sharing</p>

      <CopyRow label="Profile URL"       value={profileUrl} href={profileUrl} />
      <CopyRow label="Spotlight Card URL" value={cardUrl}    href={cardUrl} />

      {/* WhatsApp share */}
      {whatsAppShareUrl && (
        <div>
          <p className="text-[0.62rem] font-black text-gray-400 uppercase tracking-wider mb-1">
            WhatsApp Share
          </p>
          <a
            href={whatsAppShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
          >
            <span>💬</span> Share to WhatsApp
          </a>
        </div>
      )}

      {/* QR Code */}
      <div>
        <p className="text-[0.62rem] font-black text-gray-400 uppercase tracking-wider mb-2">
          QR Code
        </p>
        <div className="flex items-center gap-4">
          <div className="bg-white border border-gray-200 p-2 rounded-xl inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR Code" className="w-20 h-20" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-2 leading-relaxed">
              Encodes the full profile URL. Use on posters, business cards, and printed materials.
            </p>
            <button
              onClick={downloadQR}
              className="text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors"
            >
              {qrDownloaded ? '✓ Downloading…' : '⬇ Download QR'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
