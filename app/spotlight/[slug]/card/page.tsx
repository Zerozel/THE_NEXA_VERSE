// app/spotlight/[slug]/card/page.tsx — SERVER COMPONENT (public, no auth)
// ─────────────────────────────────────────────────────────────────────────────
// The Spotlight Card: the shareable gateway to the full public profile.
// Intentionally minimal. Shows only enough to create curiosity.
// Every section and biography belongs on the full profile, not here.
// ─────────────────────────────────────────────────────────────────────────────
import { cache }               from 'react';
import { notFound }            from 'next/navigation';
import Link                    from 'next/link';
import type { Metadata }       from 'next';
import { createAdminClient }   from '@/lib/supabase-server';
import { getPublicProfile }    from '@/lib/spotlight/profiles';
import { generateProfileQR, getProfileUrl, getOgImageUrl } from '@/lib/spotlight/sharing';

export const dynamic = 'force-dynamic';

const getCachedCard = cache(async (slug: string) => {
  const db = createAdminClient();
  return getPublicProfile(db, slug);
});

type Params = { params: { slug: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const profile = await getCachedCard(params.slug);
  if (!profile) return { title: 'Spotlight — Nexaverse' };

  const displayName  = profile.display_name ?? profile.participant_name;
  const description  = profile.sharing_caption
    ?? profile.headline
    ?? `Discover ${displayName} on NEXA Spotlight.`;

  return {
    title:       `${displayName} — Spotlight`,
    description,
    openGraph: {
      title:       `${displayName} — Spotlight`,
      description,
      images:      [{ url: getOgImageUrl(params.slug), width: 1200, height: 630 }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       `${displayName} — Spotlight`,
      description,
      images:      [getOgImageUrl(params.slug)],
    },
    alternates: {
      canonical: getProfileUrl(params.slug),
    },
  };
}

export default async function SpotlightCardPage({ params }: Params) {
  const profile = await getCachedCard(params.slug);
  if (!profile) notFound();

  const displayName  = profile.display_name ?? profile.participant_name;
  const profileUrl   = getProfileUrl(params.slug);
  const topSkills    = profile.skills.slice(0, 2);

  // Generate QR server-side — encode the full profile URL, not the card URL.
  // Scanning a physical card should go directly to the destination.
  const qrDataUrl = await generateProfileQR(params.slug);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">

        {/* ── CARD ────────────────────────────────────────────────────── */}
        <div className="relative bg-[#111] border border-[#D4AF37]/20 rounded-3xl overflow-hidden shadow-2xl">

          {/* Gold accent line */}
          <div className="h-1 w-full bg-gradient-to-r from-[#D4AF37] via-[#f0d060] to-[#D4AF37]" />

          <div className="px-8 pt-8 pb-6 text-center">

            {/* Profile image or initial */}
            <div className="mx-auto mb-5 relative">
              {profile.profile_image_url ? (
                <img
                  src={profile.profile_image_url}
                  alt={displayName}
                  className="w-24 h-24 rounded-2xl object-cover mx-auto border-2 border-[#D4AF37]/30"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mx-auto">
                  <span
                    className="text-3xl font-black text-[#D4AF37]"
                    style={{ fontFamily: 'var(--font-headline, Lato, sans-serif)' }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {profile.is_featured && (
                <span className="absolute -top-2 -right-2 text-[0.55rem] font-black text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                  ✦
                </span>
              )}
            </div>

            {/* Name */}
            <h1
              className="text-2xl font-black text-white mb-1 leading-tight"
              style={{ fontFamily: 'var(--font-headline, Lato, sans-serif)' }}
            >
              {displayName}
            </h1>

            {/* Headline — the one-liner */}
            {profile.headline && (
              <p className="text-[#D4AF37] text-sm font-semibold mb-3 leading-snug px-2">
                {profile.headline}
              </p>
            )}

            {/* Category */}
            {profile.category && (
              <span className="inline-block text-xs font-bold bg-white/8 text-white/60 border border-white/10 px-3 py-1 rounded-full mb-4">
                {profile.category}
              </span>
            )}

            {/* Skills — max 2 */}
            {topSkills.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {topSkills.map(skill => (
                  <span
                    key={skill}
                    className="text-xs font-semibold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 px-2.5 py-1 rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div className="bg-white p-2 rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Scan to view full Spotlight" className="w-20 h-20" />
              </div>
            </div>

            {/* Primary CTA */}
            <Link
              href={profileUrl}
              className="block w-full bg-[#D4AF37] hover:bg-[#C9A227] active:scale-[0.98] text-black font-black text-sm py-3.5 rounded-xl transition-all text-center mb-3"
            >
              View Full Spotlight →
            </Link>

            {/* Brand */}
            <p className="text-white/20 text-[0.65rem] tracking-wider uppercase">
              NEXA Spotlight
            </p>
          </div>
        </div>

        {/* ── BACK LINK ────────────────────────────────────────────────── */}
        <p className="text-center mt-5">
          <Link
            href={profileUrl}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            View the full profile instead →
          </Link>
        </p>
      </div>
    </div>
  );
}
