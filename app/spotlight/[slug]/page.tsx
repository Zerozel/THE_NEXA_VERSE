// app/spotlight/[slug]/page.tsx — SERVER COMPONENT (public, no auth)
// This is the primary public-facing output of the entire Spotlight platform.
// Every future phase — Cards, Feed, Search, Analytics, Distribution — links here.
import { cache }                from 'react';
import { notFound }             from 'next/navigation';
import type { Metadata }        from 'next';
import { createAdminClient }    from '@/lib/supabase-server';
import { getPublicProfile }     from '@/lib/spotlight/profiles';
import type { PublicProfile }   from '@/lib/spotlight/types';
import { getOgImageUrl, getCardUrl, getQrUrl, getProfileUrl } from '@/lib/spotlight/sharing';
import ShareButton      from '@/components/spotlight/share/ShareButton';


export const dynamic = 'force-dynamic';

// React cache() deduplicates the DB fetch between generateMetadata and
// the page component — they both call this, but only one DB query fires.
const getCachedProfile = cache(async (slug: string): Promise<PublicProfile | null> => {
  const db = createAdminClient();
  return getPublicProfile(db, slug);
});

type Params = { params: { slug: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const profile = await getCachedProfile(params.slug);
  if (!profile) return { title: 'Profile Not Found — Spotlight' };

  const displayName = profile.display_name ?? profile.participant_name;
  const description = profile.sharing_caption
    ?? profile.headline
    ?? `${displayName}'s Spotlight profile on the Nexaverse community.`;

  return {
    title:       `${displayName} — Spotlight`,
    description,
    openGraph: {
      title:       `${displayName} — Spotlight`,
      description,
      type:        'profile',
      images:      [{ url: getOgImageUrl(params.slug), width: 1200, height: 630, alt: `${displayName} — Spotlight` }],
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

export default async function PublicProfilePage({ params }: Params) {
  const profile = await getCachedProfile(params.slug);
  if (!profile) notFound();

  const displayName = profile.display_name ?? profile.participant_name;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-16">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Background accent */}
        <div className="absolute inset-0 h-64 bg-gradient-to-b from-[#D4AF37]/10 to-transparent pointer-events-none" />

        <div className="relative max-w-2xl mx-auto px-5 pt-12 pb-8">
          {/* Profile image */}
          {profile.profile_image_url ? (
            <div className="w-24 h-24 rounded-2xl overflow-hidden mb-5 border-2 border-[#D4AF37]/30">
              <img
                src={profile.profile_image_url}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mb-5">
              <span className="text-3xl font-black text-[#D4AF37]">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Identity */}
          {profile.is_featured && (
            <span className="inline-block text-[0.65rem] font-black text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2.5 py-1 rounded-full uppercase tracking-widest mb-3">
              ✦ Featured
            </span>
          )}
          <h1
            className="text-3xl font-black mb-2 leading-tight"
            style={{ fontFamily: 'var(--font-headline, Lato, sans-serif)' }}
          >
            {displayName}
          </h1>

          {/* Headline */}
          {profile.headline && (
            <p className="text-[#D4AF37] text-lg font-semibold mb-2 leading-snug">
              {profile.headline}
            </p>
          )}

          {/* Category + location */}
          <div className="flex flex-wrap gap-2 mb-5">
            {profile.category && (
              <span className="text-xs font-bold bg-white/10 text-white/80 px-3 py-1 rounded-full">
                {profile.category}
              </span>
            )}
            {profile.location && (
              <span className="text-xs text-white/50 flex items-center gap-1">
                📍 {profile.location}
              </span>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              {profile.bio}
            </p>
          )}

          {/* Skills */}
          {profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map(skill => (
                <span
                  key={skill}
                  className="text-xs font-semibold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 px-2.5 py-1 rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* Share button */}
          <div className="mt-5">
            <ShareButton
              slug={params.slug}
              participantName={profile.participant_name}
              headline={profile.headline}
              profileUrl={getProfileUrl(params.slug)}
              cardDownloadUrl={getOgImageUrl(params.slug)}
              qrUrl={getQrUrl(params.slug)}
              sharingCaption={profile.sharing_caption}
            />
          </div>
        </div>
      </div>

      {/* ── CONTENT SECTIONS ──────────────────────────────────────────── */}
      {profile.sections.length > 0 && (
        <div className="max-w-2xl mx-auto px-5 space-y-4">
          {profile.sections.map(section => (
            <div
              key={section.format}
              className="bg-white/5 border border-white/10 rounded-2xl p-5"
            >
              <p className="text-[0.65rem] font-black text-[#D4AF37] uppercase tracking-widest mb-3">
                {section.label}
              </p>
              <p className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── CONTACT & SOCIAL ──────────────────────────────────────────── */}
      {Object.keys(profile.social_links).length > 0 && (
        <div className="max-w-2xl mx-auto px-5 mt-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-[0.65rem] font-black text-[#D4AF37] uppercase tracking-widest mb-4">
              Connect
            </p>
            <div className="space-y-3">
              {Object.entries(profile.social_links).map(([platform, value]) => {
                if (!value) return null;

                const icons: Record<string, string> = {
                  whatsapp:  '💬',
                  instagram: '📸',
                  twitter:   '🐦',
                  x:         '🐦',
                  linkedin:  '💼',
                  website:   '🌐',
                  email:     '✉️',
                  facebook:  '📘',
                  tiktok:    '🎵',
                };

                const buildHref = (p: string, v: string) => {
                  if (p === 'whatsapp') return `https://wa.me/${v.replace(/\D/g, '')}`;
                  if (p === 'email')    return `mailto:${v}`;
                  if (v.startsWith('http')) return v;
                  if (p === 'instagram') return `https://instagram.com/${v.replace('@', '')}`;
                  return v;
                };

                return (
                  <a
                    key={platform}
                    href={buildHref(platform, value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors"
                  >
                    <span>{icons[platform.toLowerCase()] ?? '🔗'}</span>
                    <span className="capitalize font-semibold">{platform}</span>
                    <span className="text-white/40 text-xs truncate">{value}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-5 mt-8 text-center">
        <p className="text-white/20 text-xs">
          Powered by{' '}
          <a href="/" className="text-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors">
            NEXA Spotlight
          </a>
        </p>
      </div>
    </div>
  );
}
