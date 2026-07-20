// lib/spotlight/sharing.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure utilities for building sharing URLs and generating QR codes.
// No database calls. No side effects. Server-safe.
// ─────────────────────────────────────────────────────────────────────────────

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function getProfileUrl(slug: string): string {
  return `${baseUrl()}/spotlight/${slug}`;
}

export function getCardUrl(slug: string): string {
  return `${baseUrl()}/spotlight/${slug}/card`;
}

export function getOgImageUrl(slug: string): string {
  return `${baseUrl()}/api/spotlight/og/${slug}`;
}

export function getWhatsAppShareUrl(caption: string, profileUrl: string): string {
  const text = `${caption}\n\n${profileUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function getQrUrl(slug: string): string {
  return `${baseUrl()}/api/spotlight/qr/${slug}`;
}
/**
 * Generates a QR code as a base64 PNG data URL.
 * Encodes the full public profile URL — not the card URL.
 * Scanning a printed QR should go directly to the destination, not
 * a relay page. Server-only (uses the qrcode Node.js package).
 */
export async function generateProfileQR(slug: string): Promise<string> {
  const QRCode = await import('qrcode');
  const url    = getProfileUrl(slug);
  return QRCode.default.toDataURL(url, {
    width:  200,
    margin: 1,
    color:  { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}
