// lib/spotlight/draft.ts
// ─────────────────────────────────────────────────────────────────────────────
// Draft service — client-side functions for draft lifecycle.
//
// RESPONSIBILITIES:
//   - Create a new draft (POST /api/spotlight/drafts)
//   - Load an existing draft (GET /api/spotlight/drafts/[token])
//   - Save draft progress (PATCH /api/spotlight/drafts/[token])
//   - localStorage token management
//
// All API calls go through /api/spotlight/drafts/* — never directly to Supabase
// from the client for write operations. This keeps the service role key
// server-side and enforces validation.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  DraftData,
  SaveDraftPayload,
  CreateDraftResponse,
} from './types';

const STORAGE_KEY = 'spotlight_draft_token';

// ── LOCALSTORAGE ──────────────────────────────────────────────────────────

export function storeDraftToken(token: string): void {
  try { localStorage.setItem(STORAGE_KEY, token); } catch { /* private browsing */ }
}

export function getDraftToken(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function clearDraftToken(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

// ── API CALLS ─────────────────────────────────────────────────────────────

/**
 * Creates a new draft submission.
 * Called once when the participant first begins answering questions.
 * Returns { submission_id, draft_token } — store the token in localStorage.
 */
export async function createDraft(): Promise<CreateDraftResponse> {
  const res = await fetch('/api/spotlight/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Failed to create draft: ${res.status}`);
  return res.json();
}

/**
 * Loads an existing draft by token.
 * Returns null if token is invalid or draft no longer exists.
 * Called on page load when localStorage has a token.
 */
export async function loadDraft(token: string): Promise<DraftData | null> {
  const res = await fetch(`/api/spotlight/drafts/${token}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load draft: ${res.status}`);
  return res.json();
}

/**
 * Saves current questionnaire progress to the draft.
 * Called by the debounced auto-save system.
 * Returns true on success.
 */
export async function saveDraft(
  token: string,
  payload: SaveDraftPayload,
): Promise<void> {
  const res = await fetch(`/api/spotlight/drafts/${token}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to save draft: ${res.status}`);
}
