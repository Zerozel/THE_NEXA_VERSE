// lib/spotlight/agreement.ts
// ─────────────────────────────────────────────────────────────────────────────
// Agreement service — client-side functions for the consent step.
//
// Mirrors the pattern of lib/spotlight/draft.ts (Phase 3B):
// all writes go through dedicated API routes, never directly to Supabase
// from the client.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  AgreementStatus,
  AcceptAgreementPayload,
  AcceptAgreementResponse,
} from './types';

/**
 * Checks whether this draft has already accepted an agreement.
 * Used on mount so a returning participant who already agreed
 * doesn't have to re-read and re-check (unless version changed).
 */
export async function getAgreementStatus(token: string): Promise<AgreementStatus> {
  const res = await fetch(`/api/spotlight/agreements/${token}`);
  if (!res.ok) {
    return { accepted: false, agreement_version: null, accepted_at: null };
  }
  return res.json();
}

/**
 * Records agreement acceptance for this draft.
 * Server validates the draft token and submission status before writing.
 */
export async function acceptAgreement(
  token: string,
  payload: AcceptAgreementPayload,
): Promise<AcceptAgreementResponse> {
  const res = await fetch(`/api/spotlight/agreements/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to record agreement: ${res.status}`);
  }
  return res.json();
}
