// app/spotlight/submit/[step]/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3B STUB — Not active in Phase 3A.
//
// In Phase 3A, all questionnaire state lives client-side in QuestionnaireFlow.
// Step navigation does not change the URL.
//
// In Phase 3B (draft saving), this route will:
//   - Load a draft submission by token
//   - Restore answers for the given step
//   - Allow users to share or bookmark their progress
//
// For now: redirect any direct [step] URL to the main submit page.
// ─────────────────────────────────────────────────────────────────────────────
import { redirect } from 'next/navigation';

export default function StepRedirectPage() {
  redirect('/spotlight/submit');
}
