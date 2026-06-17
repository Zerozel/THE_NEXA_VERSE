'use client';
// components/spotlight/submission/AgreementScreen.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The Spotlight Participation Agreement screen.
//
// FLOW:
//   1. Participant reads the agreement points (plain language)
//   2. Checks the consent checkbox
//   3. Clicks "I Agree & Continue"
//   4. POST /api/spotlight/agreements/[token] records acceptance
//   5. On success → onAccepted() callback (parent moves to 'complete' phase)
//
// On mount, checks if this draft already accepted the current version
// (e.g. participant navigated back and forth) — if so, the checkbox
// starts pre-checked and an "already agreed" note is shown.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import {
  CURRENT_AGREEMENT_VERSION,
  AGREEMENT_TITLE,
  AGREEMENT_INTRO,
  AGREEMENT_POINTS,
  CONSENT_STATEMENT,
} from '@/lib/spotlight/agreementContent';
import { getAgreementStatus, acceptAgreement } from '@/lib/spotlight/agreement';
import SpotlightButton   from '@/components/spotlight/ui/SpotlightButton';
import SpotlightCheckbox from '@/components/spotlight/ui/SpotlightCheckbox';

interface AgreementScreenProps {
  draftToken: string | null;
  onBack:     () => void;
  onAccepted: () => void;
}

export default function AgreementScreen({ draftToken, onBack, onAccepted }: AgreementScreenProps) {
  const [checked,    setChecked]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string>('');
  const [alreadyAccepted, setAlreadyAccepted] = useState<{ version: string; at: string } | null>(null);

  // ── Check existing acceptance on mount ────────────────────────────────
  useEffect(() => {
    if (!draftToken) return;
    getAgreementStatus(draftToken).then(status => {
      if (status.accepted && status.agreement_version === CURRENT_AGREEMENT_VERSION) {
        setChecked(true);
        setAlreadyAccepted({
          version: status.agreement_version!,
          at:      status.accepted_at!,
        });
      }
    });
  }, [draftToken]);

  async function handleContinue() {
    if (!checked) {
      setError('Please check the box to confirm you agree before continuing.');
      return;
    }

    if (!draftToken) {
      setError('We could not find your draft. Please go back and try again.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Build the full snapshot text — exactly what's shown on screen.
      const snapshot = [AGREEMENT_INTRO, ...AGREEMENT_POINTS, CONSENT_STATEMENT].join('\n\n');

      await acceptAgreement(draftToken, {
        agreement_version: CURRENT_AGREEMENT_VERSION,
        agreement_text:    snapshot,
      });

      onAccepted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <span className="text-[0.7rem] font-black text-[#D4AF37] uppercase tracking-widest block mb-1">
          Last Step
        </span>
        <h2 className="text-xl font-black text-gray-900" style={{ fontFamily: 'var(--font-headline)' }}>
          {AGREEMENT_TITLE}
        </h2>
        <p className="text-gray-500 text-sm mt-1 leading-relaxed">
          {AGREEMENT_INTRO}
        </p>
      </div>

      {/* Already accepted notice */}
      {alreadyAccepted && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5">
          <p className="text-green-700 text-sm">
            ✓ You already agreed to this on {new Date(alreadyAccepted.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.
            You can continue, or review the points below again.
          </p>
        </div>
      )}

      {/* Agreement points */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <ol className="space-y-4">
          {AGREEMENT_POINTS.map((point, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] text-xs font-black flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-gray-700 text-sm leading-relaxed">{point}</p>
            </li>
          ))}
        </ol>
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-gray-400 text-xs">
            Agreement version {CURRENT_AGREEMENT_VERSION}
          </p>
        </div>
      </div>

      {/* Consent checkbox */}
      <div className="mb-6">
        <SpotlightCheckbox
          checked={checked}
          onChange={(v) => { setChecked(v); if (v) setError(''); }}
          label={CONSENT_STATEMENT}
          error={error || undefined}
        />
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <SpotlightButton variant="ghost" onClick={onBack} disabled={submitting}>
          ← Back to Review
        </SpotlightButton>
        <SpotlightButton
          variant="primary"
          fullWidth
          onClick={handleContinue}
          loading={submitting}
        >
          I Agree & Continue →
        </SpotlightButton>
      </div>

      <p className="text-center text-gray-400 text-xs mt-3">
        Your application stays as a draft. Final submission is the next step.
      </p>
    </div>
  );
}
