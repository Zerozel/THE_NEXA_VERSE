'use client';
// components/spotlight/submission/TrackingTokenCard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Displays the tracking token with copy-to-clipboard.
// The future tracking link (/spotlight/track/[token]) is shown but
// not yet active — Phase 3E builds the live status page.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';

export default function TrackingTokenCard({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore, text is still selectable
    }
  }

  return (
    <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl p-5 mb-6 text-left">
      <p className="text-xs font-black text-[#D4AF37] uppercase tracking-wider mb-2">
        Your Tracking Code
      </p>
      <div className="flex items-center gap-2 mb-3">
        <code className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono text-gray-800 break-all">
          {token}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 bg-[#D4AF37] text-black text-xs font-bold px-3 py-2.5 rounded-lg hover:bg-[#C9A227] transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <p className="text-gray-600 text-xs leading-relaxed">
        Save this code — it's the only way to reference your application.
        A status tracking page is coming soon.
      </p>
    </div>
  );
}
