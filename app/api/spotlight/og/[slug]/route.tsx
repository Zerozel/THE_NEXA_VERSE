// app/api/spotlight/og/[slug]/route.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Open Graph image for every published Spotlight profile.
// Called automatically by WhatsApp, Telegram, iMessage, Twitter, LinkedIn
// etc. when someone pastes a Spotlight URL.
//
// Returns 1200×630 PNG. Uses Next.js ImageResponse (no external service).
// Revalidates every hour at the edge — profile image changes from Phase 9
// will propagate within the hour without any code changes here.
// ─────────────────────────────────────────────────────────────────────────────
import { ImageResponse }         from 'next/og';
import { type NextRequest }      from 'next/server';
import { createAdminClient }     from '@/lib/supabase-server';
import { getPublicProfile }      from '@/lib/spotlight/profiles';

export const runtime   = 'nodejs';
export const revalidate = 3600; // 1-hour edge cache

const W = 1200;
const H = 630;

type Params = { params: { slug: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const db      = createAdminClient();
  const profile = await getPublicProfile(db, params.slug);

  // Fallback OG for missing / unpublished profiles
  if (!profile) {
    return new ImageResponse(
      (
        <div
          style={{
            width: W, height: H,
            background: '#0a0a0a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: '#444', fontSize: 28, fontFamily: 'sans-serif' }}>
            Spotlight — Nexaverse
          </span>
        </div>
      ),
      { width: W, height: H },
    );
  }

  const displayName  = profile.display_name ?? profile.participant_name;
  const initials     = displayName.slice(0, 2).toUpperCase();
  const hasPhoto     = Boolean(profile.profile_image_url);
  const topTwoSkills = profile.skills.slice(0, 2);

  return new ImageResponse(
    (
      <div
        style={{
          width: W, height: H,
          background: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Gold top bar */}
        <div style={{ width: '100%', height: 6, background: '#D4AF37', display: 'flex' }} />

        {/* Subtle gold gradient */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 300,
          background: 'linear-gradient(180deg, rgba(212,175,55,0.08) 0%, transparent 100%)',
          display: 'flex',
        }} />

        {/* Main layout */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          padding: '0 80px',
          gap: 60,
        }}>
          {/* Photo or initial */}
          <div style={{
            width: 160, height: 160,
            borderRadius: 24,
            background: hasPhoto ? 'transparent' : 'rgba(212,175,55,0.15)',
            border: '2px solid rgba(212,175,55,0.3)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {hasPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.profile_image_url!}
                alt={displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ color: '#D4AF37', fontSize: 56, fontWeight: 900 }}>
                {initials}
              </span>
            )}
          </div>

          {/* Text */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {/* Name */}
            <span style={{
              color: '#ffffff',
              fontSize: 52,
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: 12,
            }}>
              {displayName.length > 28 ? displayName.slice(0, 28) + '…' : displayName}
            </span>

            {/* Headline */}
            {profile.headline && (
              <span style={{
                color: '#D4AF37',
                fontSize: 26,
                fontWeight: 600,
                lineHeight: 1.3,
                marginBottom: 20,
              }}>
                {profile.headline.length > 60
                  ? profile.headline.slice(0, 60) + '…'
                  : profile.headline}
              </span>
            )}

            {/* Category */}
            {profile.category && (
              <div style={{ display: 'flex', marginBottom: 16 }}>
                <span style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 18,
                  padding: '6px 16px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.12)',
                }}>
                  {profile.category}
                </span>
              </div>
            )}

            {/* Skills */}
            {topTwoSkills.length > 0 && (
              <div style={{ display: 'flex', gap: 10 }}>
                {topTwoSkills.map(skill => (
                  <span key={skill} style={{
                    background: 'rgba(212,175,55,0.12)',
                    color: '#D4AF37',
                    border: '1px solid rgba(212,175,55,0.25)',
                    fontSize: 16,
                    padding: '5px 14px',
                    borderRadius: 999,
                  }}>
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 80px 32px',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 16 }}>
            nexaverse.app/spotlight/{profile.slug}
          </span>
          <span style={{
            color: '#D4AF37',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 2,
          }}>
            NEXA Spotlight
          </span>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
