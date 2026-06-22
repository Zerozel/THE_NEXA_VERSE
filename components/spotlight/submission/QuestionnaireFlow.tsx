'use client';
// components/spotlight/submission/QuestionnaireFlow.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Master orchestrator — owns all questionnaire state.
// Phase 3B: integrates draft persistence via useDraft hook.
// Phase 3C: Integrates AgreementScreen and FlowPhase logic.
// Phase 3D: Integrates final submission logic and routing.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type {
  QuestionnaireConfig,
  Answers,
  AnswerValue,
  ValidationErrors,
  QuestionnaireState,
  FlowPhase,
} from '@/lib/spotlight/types';
import { validateStep, getProgress } from '@/lib/spotlight/questionnaire';
import { useDraft }          from '@/lib/spotlight/useDraft';
import { submitDraft, SubmissionError } from '@/lib/spotlight/submission';
import ProgressBar           from './ProgressBar';
import QuestionnaireStep     from './QuestionnaireStep';
import ReviewStep            from './ReviewStep';
import AutoSaveIndicator     from './AutoSaveIndicator';
import SpotlightButton       from '@/components/spotlight/ui/SpotlightButton';
import AgreementScreen       from './AgreementScreen';

// Question keys used to extract identity fields for the draft record
const EMAIL_KEY = 'email_address';
const NAME_KEY  = 'full_name';

interface QuestionnaireFlowProps {
  config: QuestionnaireConfig;
}

export default function QuestionnaireFlow({ config }: QuestionnaireFlowProps) {
  const router = useRouter();

  const { steps, total_steps } = config;

  const {
    isRestoring,
    draftToken,
    saveStatus,
    restoredDraft,
    triggerSave,
    clearDraft,
  } = useDraft();

  const [state, setState] = useState<QuestionnaireState>({
    answers:         {},
    currentStep:     0,
    errors:          {},
    completedSteps:  new Set(),
    isTransitioning: false,
  });
  
  // Appended 'submitting' to support the transition phase
  const [phase, setPhase] = useState<FlowPhase | 'submitting'>('questionnaire');
  const [submitError, setSubmitError] = useState<string>('');
  const [submitMissing, setSubmitMissing] = useState<string[]>([]);

  // ── RESTORE STATE FROM DRAFT ─────────────────────────────────────────
  useEffect(() => {
    if (!restoredDraft) return;
    setState(prev => ({
      ...prev,
      answers:        restoredDraft.answers,
      currentStep:    restoredDraft.current_step,
      completedSteps: new Set(restoredDraft.completed_steps),
    }));
  }, [restoredDraft]);

  const isReviewStep    = state.currentStep >= total_steps;
  const currentStepData = !isReviewStep ? steps[state.currentStep] : null;

  // ── PHASE SYNC ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'agreement' || phase === 'submitting') return;
    setPhase(isReviewStep ? 'review' : 'questionnaire');
  }, [isReviewStep, phase]);

  // ── TRANSITION HANDLERS ──────────────────────────────────────────────
  function handleReviewContinue() {
    setPhase('agreement');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleAgreementBack() {
    setPhase('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Phase 3D Submission logic
  async function handleAgreementAccepted() {
    setSubmitError('');
    setSubmitMissing([]);
    setPhase('submitting');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (!draftToken) {
      setSubmitError('We could not find your draft. Please refresh the page and try again.');
      setPhase('agreement');
      return;
    }

    try {
      const result = await submitDraft(draftToken);

      // Submission complete — the draft token is no longer useful.
      // The tracking token (carried in the URL) is the new identifier.
      clearDraft();

      router.push(`/spotlight/success?token=${result.tracking_token}`);
    } catch (err) {
      if (err instanceof SubmissionError) {
        // Already submitted (e.g. double-click) — treat as success
        if (err.code === 'already_submitted' && err.tracking_token) {
          clearDraft();
          router.push(`/spotlight/success?token=${err.tracking_token}`);
          return;
        }

        // Missing required fields/agreement — send participant back to fix it
        if (err.code === 'not_ready') {
          setSubmitMissing(err.missing ?? []);
          setSubmitError('Your application is almost ready — a few things need attention:');
          setPhase('agreement');
          return;
        }

        setSubmitError(err.message);
        setPhase('agreement');
        return;
      }

      setSubmitError('Something went wrong. Please try again.');
      setPhase('agreement');
    }
  }

  // ── SCROLL TO TOP ────────────────────────────────────────────────────
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [state.currentStep]);

  // ── ANSWER HANDLER ───────────────────────────────────────────────────
  const handleChange = useCallback((key: string, value: AnswerValue) => {
    setState(prev => {
      const newAnswers = { ...prev.answers, [key]: value };
      const newErrors  = { ...prev.errors, [key]: '' };
      const newState   = { ...prev, answers: newAnswers, errors: newErrors };

      // Trigger auto-save with updated answers
      // Extract identity fields for the draft record
      triggerSave({
        answers:         newAnswers,
        current_step:    prev.currentStep,
        completed_steps: [...prev.completedSteps],
        email:           key === EMAIL_KEY
                           ? (value as string)
                           : (newAnswers[EMAIL_KEY] as string | undefined),
        participant_name: key === NAME_KEY
                           ? (value as string)
                           : (newAnswers[NAME_KEY] as string | undefined),
      });

      return newState;
    });
  }, [triggerSave]);

  // ── NEXT ─────────────────────────────────────────────────────────────
  function handleNext() {
    if (!currentStepData) return;

    const errors: ValidationErrors = validateStep(
      currentStepData.questions,
      state.answers,
    );

    if (Object.values(errors).some(e => e !== '')) {
      const firstKey = Object.keys(errors).find(k => errors[k]);
      if (firstKey) {
        document.querySelector(`[data-question-key="${firstKey}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setState(prev => ({ ...prev, errors }));
      return;
    }

    const newCompleted = new Set([...state.completedSteps, state.currentStep]);
    const newStep      = state.currentStep + 1;

    setState(prev => ({
      ...prev,
      errors:          {},
      completedSteps:  newCompleted,
      currentStep:     newStep,
      isTransitioning: true,
    }));

    // Save immediately on step advance (don't debounce step changes)
    triggerSave({
      answers:         state.answers,
      current_step:    newStep,
      completed_steps: [...newCompleted],
    });

    setTimeout(() => setState(prev => ({ ...prev, isTransitioning: false })), 350);
  }

  // ── PREVIOUS ─────────────────────────────────────────────────────────
  function handleBack() {
    if (state.currentStep === 0) return;
    const newStep = state.currentStep - 1;
    setState(prev => ({
      ...prev,
      errors:          {},
      currentStep:     newStep,
      isTransitioning: true,
    }));

    triggerSave({
      answers:         state.answers,
      current_step:    newStep,
      completed_steps: [...state.completedSteps],
    });

    setTimeout(() => setState(prev => ({ ...prev, isTransitioning: false })), 350);
  }

  // ── PROGRESS ─────────────────────────────────────────────────────────
  const progress = getProgress(state.currentStep, total_steps, state.completedSteps);
  const stepTitles = [...steps.map(s => s.group.title), 'Review'];

  // ── RESTORE LOADING STATE ─────────────────────────────────────────────
  if (isRestoring) {
    return (
      <div className="py-20 flex flex-col items-center gap-4">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Restoring your progress…</p>
      </div>
    );
  }

  // ── RENDER ────────────────────────────────────────────────────────────
  return (
    <div className="pb-10">
      {/* Progress + auto-save row */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex-1">
          <ProgressBar progress={progress} stepTitles={stepTitles} />
        </div>
      </div>

      {/* Auto-save indicator */}
      <div className="flex justify-end mb-4 min-h-[20px]">
        <AutoSaveIndicator status={saveStatus} />
      </div>

      {/* Restored draft notice */}
      {restoredDraft && state.currentStep === restoredDraft.current_step && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
          <p className="text-green-700 text-sm">
            ✓ Progress restored — continuing from where you left off.
          </p>
          <button
            onClick={clearDraft}
            className="text-green-600 text-xs font-semibold hover:text-green-800 ml-3 shrink-0"
          >
            Start fresh
          </button>
        </div>
      )}

      {/* Step content */}
      <div
        className="transition-opacity duration-300"
        style={{ opacity: state.isTransitioning ? 0 : 1 }}
      >
        {phase === 'review' ? (
          <ReviewStep
            config={config}
            answers={state.answers}
            onBack={handleBack}
            onContinue={handleReviewContinue}
          />
        ) : phase === 'agreement' ? (
          <>
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
                <p className="text-red-700 text-sm font-medium mb-1">{submitError}</p>
                {submitMissing.length > 0 && (
                  <ul className="list-disc list-inside text-red-600 text-xs space-y-0.5 mt-1">
                    {submitMissing.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                )}
              </div>
            )}
            <AgreementScreen
              draftToken={draftToken}
              onBack={handleAgreementBack}
              onAccepted={handleAgreementAccepted}
            />
          </>
        ) : phase === 'submitting' ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Submitting your Spotlight application…</p>
          </div>
        ) : currentStepData ? (
          <>
            <QuestionnaireStep
              step={currentStepData}
              answers={state.answers}
              errors={state.errors}
              onChange={handleChange}
            />

            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
              {state.currentStep > 0 && (
                <SpotlightButton variant="ghost" onClick={handleBack}>
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

            <p className="text-center text-gray-400 text-xs mt-3">
              Fields marked <span className="text-[#D4AF37] font-bold">*</span> are required
              · Your progress is saved automatically.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
