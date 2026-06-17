'use client';
// components/spotlight/submission/QuestionnaireStep.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Renders all questions for one questionnaire step.
// Receives data and callbacks as props — owns no state.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  QuestionnaireStep as StepType,
  Answers,
  AnswerValue,
  ValidationErrors,
} from '@/lib/spotlight/types';
import QuestionRenderer         from './QuestionRenderer';
import { countAnsweredRequired } from '@/lib/spotlight/questionnaire';

interface QuestionnaireStepProps {
  step:     StepType;
  answers:  Answers;
  errors:   ValidationErrors;
  onChange: (key: string, value: AnswerValue) => void;
}

export default function QuestionnaireStep({
  step, answers, errors, onChange,
}: QuestionnaireStepProps) {
  const { group, questions, step_number } = step;
  const { answered, total } = countAnsweredRequired(questions, answers);

  return (
    <div>
      {/* ── Step header ────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[0.7rem] font-black text-[#D4AF37] uppercase tracking-widest">
            Step {step_number}
          </span>
          {total > 0 && (
            <span className="text-[0.65rem] text-gray-400 font-medium">
              {answered}/{total} required
            </span>
          )}
        </div>
        <h2
          className="text-xl font-black text-gray-900 leading-tight"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {group.title}
        </h2>
        {group.description && (
          <p className="text-gray-500 text-sm mt-1 leading-relaxed">
            {group.description}
          </p>
        )}
      </div>

      {/* ── Questions ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        {questions.map(q => (
          // data-question-key enables QuestionnaireFlow to scroll
          // the browser to the first invalid field on failed validation.
          <div key={q.id} data-question-key={q.question_key}>
            <QuestionRenderer
              question={q}
              value={answers[q.question_key] ?? (
                q.input_type === 'multiselect' || q.input_type === 'tags' ? [] : ''
              )}
              error={errors[q.question_key]}
              onChange={onChange}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
