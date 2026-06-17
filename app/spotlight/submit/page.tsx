// app/spotlight/submit/page.tsx  —  SERVER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
// Entry point for the questionnaire flow.
// Fetches questionnaire config server-side (no client loading state).
// Passes config as a prop to the client-side QuestionnaireFlow.
//
// PHASE 3A: No database writes. No draft creation. No submissions.
//           This page only renders and navigates the questionnaire.
// ─────────────────────────────────────────────────────────────────────────────
import { fetchQuestionnaire } from '@/lib/spotlight/questionnaire';
import QuestionnaireFlow     from '@/components/spotlight/submission/QuestionnaireFlow';

export const metadata = { title: 'Apply — Spotlight' };

export default async function SpotlightSubmitPage() {
  const config = await fetchQuestionnaire();

  // If the API fails, show a graceful error rather than crashing
  if (!config || config.steps.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-4">⚠️</p>
        <h2 className="font-bold text-gray-800 text-lg mb-2">
          Questionnaire unavailable
        </h2>
        <p className="text-gray-500 text-sm max-w-xs mx-auto">
          We could not load the Spotlight questionnaire right now.
          Please try again in a moment.
        </p>
        <a
          href="/spotlight/submit"
          className="inline-block mt-6 bg-[#D4AF37] text-black font-bold px-6 py-3 rounded-xl text-sm"
        >
          Try Again
        </a>
      </div>
    );
  }

  return <QuestionnaireFlow config={config} />;
}
