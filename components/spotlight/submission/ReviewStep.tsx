'use client';
// components/spotlight/submission/ReviewStep.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Final step — shows all answers grouped by section for review.
// Read-only. No editing here; user goes back to edit.
// The "Continue" button at the bottom is Phase 3B's entry point
// (agreement + submission). Renders disabled with a note for now.
// ─────────────────────────────────────────────────────────────────────────────
import type { QuestionnaireConfig, Answers } from '@/lib/spotlight/types';
import { formatAnswerForReview }              from '@/lib/spotlight/questionnaire';
import SpotlightButton                        from '@/components/spotlight/ui/SpotlightButton';

interface ReviewStepProps {
  config:  QuestionnaireConfig;
  answers: Answers;
  onBack:  () => void;
}

export default function ReviewStep({ config, answers, onBack }: ReviewStepProps) {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <span className="text-[0.7rem] font-black text-[#D4AF37] uppercase tracking-widest block mb-1">
          Final Step
        </span>
        <h2
          className="text-xl font-black text-gray-900"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          Review Your Application
        </h2>
        <p className="text-gray-500 text-sm mt-1 leading-relaxed">
          Read through your answers before continuing. Go back to edit anything.
        </p>
      </div>

      {/* Answer groups */}
      <div className="flex flex-col gap-5 mb-8">
        {config.steps.map(step => (
          <div
            key={step.group.id}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          >
            {/* Group header */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[0.65rem] text-[#D4AF37] font-black uppercase tracking-wider">
                  Step {step.step_number}
                </p>
                <p className="font-bold text-gray-800 text-sm">{step.group.title}</p>
              </div>
              <button
                type="button"
                onClick={onBack}
                className="text-xs text-[#D4AF37] font-semibold hover:underline"
              >
                Edit
              </button>
            </div>

            {/* Answers */}
            <div className="divide-y divide-gray-50">
              {step.questions.map(q => {
                const raw     = answers[q.question_key];
                const display = formatAnswerForReview(raw);
                const isEmpty = display === '—';

                return (
                  <div key={q.id} className="px-4 py-3">
                    <p className="text-xs text-gray-400 mb-0.5 leading-snug">{q.question_text}</p>
                    <p className={`text-sm leading-relaxed ${isEmpty ? 'text-gray-300 italic' : 'text-gray-800 font-medium'}`}>
                      {display}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Phase 3B placeholder CTA */}
      <div className="bg-[#D4AF37]/8 border border-[#D4AF37]/30 rounded-2xl p-5 mb-4 text-center">
        <p className="text-2xl mb-2">🚀</p>
        <p className="font-bold text-gray-800 text-sm mb-1">
          Ready to submit your Spotlight?
        </p>
        <p className="text-gray-500 text-xs leading-relaxed">
          Submission and agreement flow coming in Phase 3B.
          Your answers have been collected successfully.
        </p>
      </div>

      <div className="flex gap-3">
        <SpotlightButton variant="ghost" onClick={onBack} fullWidth>
          ← Go Back
        </SpotlightButton>
        <SpotlightButton
          variant="primary"
          fullWidth
          disabled
          title="Available in Phase 3B"
        >
          Continue to Agreement →
        </SpotlightButton>
      </div>
    </div>
  );
}
