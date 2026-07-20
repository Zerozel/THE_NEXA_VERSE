// app/api/spotlight/qr/[slug]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Returns the Spotlight profile QR code as a PNG image.
// Encodes the full profile URL (not the card URL).
// 1-hour cache — stable across repeated share modal opens.
// ─────────────────────────────────────────────────────────────────────────────
import { type NextRequest } from 'next/server';
import { getProfileUrl }    from '@/lib/spotlight/sharing';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

type Params = { params: { slug: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const QRCode    = await import('qrcode');
    const profileUrl = getProfileUrl(params.slug);

    const buffer = await QRCode.default.toBuffer(profileUrl, {
      width:  400,
      margin: 2,
      color:  { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type':  'image/png',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    // Minimal fallback — blank 1x1 PNG rather than a broken image
    return new Response(null, { status: 404 });
  }
}
