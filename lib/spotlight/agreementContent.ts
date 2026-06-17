// lib/spotlight/agreementContent.ts
// ─────────────────────────────────────────────────────────────────────────────
// THE SPOTLIGHT PARTICIPATION AGREEMENT — single source of truth.
//
// VERSIONING:
//   Bump CURRENT_AGREEMENT_VERSION whenever AGREEMENT_POINTS changes.
//   Historical acceptances keep their own text snapshot in
//   spotlight_agreements.agreement_text — changing this file never
//   affects records already written to the database.
//
// TONE:
//   Plain language. No legal jargon. Written so a first-time participant
//   on a phone, possibly in a hurry, understands exactly what they're
//   agreeing to in under two minutes of reading.
// ─────────────────────────────────────────────────────────────────────────────

export const CURRENT_AGREEMENT_VERSION = 'v1.0';

export const AGREEMENT_TITLE = 'Spotlight Participation Agreement';

/**
 * The full agreement text for CURRENT_AGREEMENT_VERSION.
 * Rendered as an ordered list of plain-language points in the UI.
 * Also stored verbatim (joined) in spotlight_agreements.agreement_text
 * at the moment of acceptance.
 */
export const AGREEMENT_POINTS: string[] = [
  'Everything I shared in this application is true and accurate to the best of my knowledge. If something changes, I can let the NEXA team know and ask for a correction.',

  'If my application is approved, NEXA and the Nexaverse community can feature my story, business, or work in a Spotlight post.',

  'Approved Spotlight content can be published across Nexaverse channels — including WhatsApp groups, community channels, and other platforms the Nexaverse team distributes to.',

  'NEXA can turn my answers into promotional content — such as short posts, quotes, summaries, or graphics — based on what I shared, to help tell my story well.',

  'I still own my personal brand, business name, and everything about who I am. Being featured in Spotlight does not give NEXA ownership of my work — it is a feature, not a transfer.',

  'If I ever want something corrected, removed, or updated after it is published, I can reach out to the NEXA team and request a change.',

  'I understand that being featured does not guarantee any specific business outcome — Spotlight is a storytelling and visibility feature, not a paid advertisement.',
];

/**
 * Short summary shown above the full agreement — sets expectations
 * before the participant reads the full list.
 */
export const AGREEMENT_INTRO =
  'Before we wrap up, please read through this short agreement. ' +
  'It explains how your information may be used if your Spotlight ' +
  'application is approved. No legal jargon — just what you need to know.';

/**
 * The exact consent statement shown next to the checkbox.
 * This sentence (plus the version) is what "acceptance" refers to.
 */
export const CONSENT_STATEMENT =
  'I have read and agree to the Spotlight Participation Agreement.';
