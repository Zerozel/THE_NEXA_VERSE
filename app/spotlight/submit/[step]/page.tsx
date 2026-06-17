// app/spotlight/submit/[step]/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Phase 3B: Now active for deep-link step restoration.
// Validates the step param and renders the questionnaire starting at that step.
// The client-side useDraft hook handles the actual state restoration.
// ─────────────────────────────────────────────────────────────────────────────
import { notFound }          from 'next/navigation';
import { fetchQuestionnaire } from '@/lib/spotlight/questionnaire';
import QuestionnaireFlow      from '@/components/spotlight/submission/QuestionnaireFlow';

type Params = { params: { step: string } };

export default async function StepPage({ params }: Params) {
  const stepNum = parseInt(params.step, 10);

  const config = await fetchQuestionnaire();
  if (!config) return notFound();

  // Validate step range (1 to total_steps + 1 for review)
  if (isNaN(stepNum) || stepNum < 1 || stepNum > config.total_steps + 1) {
    return notFound();
  }

  // QuestionnaireFlow restores the correct step via useDraft on the client
  return <QuestionnaireFlow config={config} />;
}
