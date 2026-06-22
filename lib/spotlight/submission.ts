// lib/spotlight/submission.ts
// ─────────────────────────────────────────────────────────────────────────────
// Submission service — client-side function for final submission.
//
// Mirrors lib/spotlight/draft.ts and lib/spotlight/agreement.ts:
// a thin fetch wrapper, all logic server-side.
// ─────────────────────────────────────────────────────────────────────────────
import type { SubmitDraftResponse, SubmitErrorResponse } from './types';

/** Error thrown by submitDraft — carries the server's error code and details. */
export class SubmissionError extends Error {
  code: SubmitErrorResponse['code'];
  missing?: string[];
  tracking_token?: string;

  constructor(body: SubmitErrorResponse) {
    super(body.error);
    this.code           = body.code;
    this.missing        = body.missing;
    this.tracking_token = body.tracking_token;
  }
}

/**
 * Submits a draft for final review.
 * Throws SubmissionError on any non-2xx response — callers should
 * check `err.code` to handle 'already_submitted' and 'not_ready' specially.
 */
export async function submitDraft(draftToken: string): Promise<SubmitDraftResponse> {
  const res  = await fetch('/api/spotlight/submissions/submit', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ draft_token: draftToken }),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new SubmissionError(body as SubmitErrorResponse);
  }

  return body as SubmitDraftResponse;
}
