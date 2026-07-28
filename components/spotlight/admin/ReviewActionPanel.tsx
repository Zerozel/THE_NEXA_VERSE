'use client';
// components/spotlight/admin/ReviewActionPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Two-step confirmation flow: pick an action → write a required note →
// confirm. On approval, redirects to submission detail so the admin sees
// the newly created content items and "Generate AI Content →" guidance.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SpotlightButton   from '@/components/spotlight/ui/SpotlightButton';
import SpotlightTextarea from '@/components/spotlight/ui/SpotlightTextarea';
import type { ReviewAction, SpotlightSubmissionStatus } from '@/lib/spotlight/types';

interface Props {
  submissionId: string;
  currentStatus: SpotlightSubmissionStatus;
}

const ACTIONS: { key: ReviewAction; label: string; variant: 'primary' | 'secondary' | 'ghost'; confirmColor: string }[] = [
  { key: 'approved', label: 'Approve', variant: 'primary',   confirmColor: 'text-green-600' },
  { key: 'flagged',  label: 'Flag',    variant: 'secondary', confirmColor: 'text-amber-600' },
  { key: 'rejected', label: 'Reject',  variant: 'ghost',     confirmColor: 'text-red-600'   },
];

export default function ReviewActionPanel({ submissionId, currentStatus }: Props) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null);
  const [note, setNote]             = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  if (currentStatus !== 'submitted') {
    return (
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 text-center">
        <p className="text-gray-500 text-sm">
          This submission has already been reviewed. See the review history below.
        </p>
      </div>
    );
  }

  const activeAction = ACTIONS.find(a => a.key === pendingAction);

  async function handleConfirm() {
    if (!pendingAction) return;
    if (note.trim().length < 5) {
      setError('Please write a note of at least 5 characters explaining your decision.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/spotlight/admin/submissions/${submissionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: pendingAction, note: note.trim() }),
      });

      const resBody = await res.json();

      if (!res.ok) {
        setError(resBody.error ?? 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }

      // On approval, redirect to submission detail so admin sees the
      // content items that were just created and the "Generate AI Content" link.
      // On reject/flag, refresh to show updated status in-place.
      if (pendingAction === 'approved') {
        router.push(`/spotlight/admin/submissions/${submissionId}`);
      } else {
        router.refresh();
      }
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">
        Review Decision
      </p>

      {!pendingAction ? (
        <div className="flex flex-col gap-2">
          {ACTIONS.map(a => (
            <SpotlightButton
              key={a.key}
              variant={a.variant}
              fullWidth
              onClick={() => { setPendingAction(a.key); setError(''); }}
            >
              {a.label}
            </SpotlightButton>
          ))}
        </div>
      ) : (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">
            You are about to{' '}
            <span className={activeAction?.confirmColor}>{activeAction?.label.toLowerCase()}</span>{' '}
            this submission.
          </p>
          <SpotlightTextarea
            label="Review Note (required)"
            placeholder="Explain your decision — this is stored permanently in the audit log…"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={4}
            error={error || undefined}
          />
          <div className="flex gap-3 mt-3">
            <SpotlightButton
              variant="ghost"
              onClick={() => { setPendingAction(null); setNote(''); setError(''); }}
              disabled={submitting}
            >
              Cancel
            </SpotlightButton>
            <SpotlightButton
              variant="primary"
              fullWidth
              onClick={handleConfirm}
              loading={submitting}
            >
              Confirm {activeAction?.label}
            </SpotlightButton>
          </div>
        </div>
      )}
    </div>
  );
}
