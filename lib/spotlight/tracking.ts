// lib/spotlight/tracking.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tracking lookup — client-callable fetch wrapper.
// Works both server-side (the detail page) and client-side, using the
// same absolute-URL pattern as fetchQuestionnaire() in Phase 3A.
// ─────────────────────────────────────────────────────────────────────────────
import type { TrackingInfo, TrackingErrorResponse } from './types';

export class TrackingLookupError extends Error {
  code: TrackingErrorResponse['code'];
  constructor(body: TrackingErrorResponse) {
    super(body.error);
    this.code = body.code;
  }
}

/** sp_trk_ + 32 hex characters, exactly matching the Phase 3D generator. */
export function isValidTrackingTokenFormat(token: string): boolean {
  return /^sp_trk_[0-9a-f]{32}$/.test(token.trim());
}

export async function fetchTrackingInfo(token: string): Promise<TrackingInfo> {
  const base = typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
    : '';

  const res  = await fetch(`${base}/api/spotlight/track/${token}`, { cache: 'no-store' });
  const body = await res.json();

  if (!res.ok) throw new TrackingLookupError(body as TrackingErrorResponse);
  return body as TrackingInfo;
}
