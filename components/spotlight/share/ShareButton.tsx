'use client';
// components/spotlight/share/ShareButton.tsx
// Mounts the ShareModal on demand. Used on the public profile page.
import { useState }    from 'react';
import ShareModal      from './ShareModal';

export default function ShareButton({
  slug,
  participantName,
  headline,
  profileUrl,
  cardDownloadUrl,
  qrUrl,
  sharingCaption,
}: {
  slug: string;
  participantName: string;
  headline: string | null;
  profileUrl: string;
  cardDownloadUrl: string;
  qrUrl: string;
  sharingCaption: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
      >
        ⬆ Share Spotlight
      </button>

      {open && (
        <ShareModal
          slug={slug}
          participantName={participantName}
          headline={headline}
          profileUrl={profileUrl}
          cardDownloadUrl={cardDownloadUrl}
          qrUrl={qrUrl}
          sharingCaption={sharingCaption}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
