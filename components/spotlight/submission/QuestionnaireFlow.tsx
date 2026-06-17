'use client';
// components/spotlight/submission/QuestionnaireFlow.tsx
// ─────────────────────────────────────────────────────────────────────────────
// THE ORCHESTRATOR — owns all questionnaire state.
//
// OWNS:
//   - All user answers (Answers map keyed by question_key)
//   - Current step index
//   - Validation errors per question
//   - Set of completed steps
//   - Transition animation flag
//
// DOES NOT:
//   - Write to the database
//   - Create submissions
//   - Persist anything
//   - Know about agreements or tracking tokens
//
// All logic (validation, progress) is delegated to lib/spotlight/questionnaire.ts.
// All rendering is delegated to QuestionnaireStep / ReviewStep / ProgressBar.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useEffect } from 'react';
import type {
  QuestionnaireConfig,
  Answers,
  AnswerValue,
  ValidationErrors,
  QuestionnaireState,
} from '@/lib/spotlight/types';
import {
  validateStep,
  getProgress,
} from '@/lib/spotlight/questionnaire';
import ProgressBar      from './ProgressBar';
import QuestionnaireStep from './QuestionnaireStep';
import ReviewStep        from './ReviewStep';
import SpotlightButton   from '@/components/spotlight/ui/SpotlightButton';

interface QuestionnaireFlowProps {
  config: QuestionnaireConfig;
}

export default function QuestionnaireFlow({ config }: QuestionnaireFlowProps) {
  const { steps, total_steps } = config;

  // ── STATE ───────────────────────────────────────────────────────────────
  const [state, setState] = useState<QuestionnaireState>({
    answers:        {},
    currentStep:    0,
    errors:         {},
    completedSteps: new Set(),
    isTransitioning: false,
  });

  const isReviewStep = state.currentStep >= total_steps;
  const currentStepData = !isReviewStep ? steps[state.currentStep] : null;

  // ── SCROLL TO TOP on step change ────────────────────────────────────────
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [state.currentStep]);

  // ── ANSWER HANDLER ──────────────────────────────────────────────────────
  const handleChange = useCallback((key: string, value: AnswerValue) => {
    setState(prev => ({
      ...prev,
      answers: { ...prev.answers, [key]: value },
      // Clear error for this field as user edits
      errors:  { ...prev.errors, [key]: '' },
    }));
  }, []);

  // ── NEXT ────────────────────────────────────────────────────────────────
  function handleNext() {
    if (!currentStepData) return;

    // Validate current step
    const errors: ValidationErrors = validateStep(
      currentStepData.questions,
      state.answers,
    );

    if (Object.values(errors).some(e => e !== '')) {
      // Scroll to first error
      const firstErrKey = Object.keys(errors).find(k => errors[k]);
      if (firstErrKey) {
        const el = document.querySelector(`[data-question-key="${firstErrKey}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setState(prev => ({ ...prev, errors }));
      return;
    }

    // Mark step as complete and advance
    setState(prev => ({
      ...prev,
      errors:          {},
      completedSteps:  new Set([...prev.completedSteps, prev.currentStep]),
      currentStep:     prev.currentStep + 1,
      isTransitioning: true,
    }));

    // End transition after animation
    setTimeout(() => setState(prev => ({ ...prev, isTransitioning: false })), 350);
  }

  // ── PREVIOUS ────────────────────────────────────────────────────────────
  function handleBack() {
    if (state.currentStep === 0) return;
    setState(prev => ({
      ...prev,
      errors:          {},
      currentStep:     prev.currentStep - 1,
      isTransitioning: true,
    }));
    setTimeout(() => setState(prev => ({ ...prev, isTransitioning: false })), 350);
  }

  // ── PROGRESS ────────────────────────────────────────────────────────────
  const progress = getProgress(
    state.currentStep,
    total_steps,
    state.completedSteps,
  );

  const stepTitles = [
    ...steps.map(s => s.group.title),
    'Review',
  ];

  // ── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="pb-10">
      {/* Progress bar — always visible */}
      <ProgressBar progress={progress} stepTitles={stepTitles} />

      {/* Step content — animated */}
      <div
        className="transition-opacity duration-300"
        style={{ opacity: state.isTransitioning ? 0 : 1 }}
      >
        {isReviewStep ? (
          // ── REVIEW STEP ─────────────────────────────────────────────────
          <ReviewStep
            config={config}
            answers={state.answers}
            onBack={handleBack}
          />
        ) : currentStepData ? (
          // ── CONTENT STEPS ────────────────────────────────────────────────
          <>
            <QuestionnaireStep
              step={currentStepData}
              answers={state.answers}
              errors={state.errors}
              onChange={handleChange}
            />

            {/* ── NAVIGATION ─────────────────────────────────────────────── */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
              {state.currentStep > 0 && (
                <SpotlightButton
                  variant="ghost"
                  onClick={handleBack}
                  className="flex-shrink-0"
                >
                  ← Back
                </SpotlightButton>
              )}

              <SpotlightButton
                variant="primary"
                onClick={handleNext}
                fullWidth
                loading={state.isTransitioning}
              >
                {state.currentStep === total_steps - 1
                  ? 'Review My Answers →'
                  : 'Continue →'}
              </SpotlightButton>
            </div>

            {/* Required field note */}
            <p className="text-center text-gray-400 text-xs mt-3">
              Fields marked <span className="text-[#D4AF37] font-bold">*</span> are required.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
