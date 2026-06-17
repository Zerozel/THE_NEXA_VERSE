'use client';
// components/spotlight/submission/ProgressBar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Displays current step, total steps, and percentage completion.
// Receives a ProgressSnapshot prop — no internal logic.
// All calculation lives in lib/spotlight/questionnaire.ts → getProgress().
// ─────────────────────────────────────────────────────────────────────────────
import clsx from 'clsx';
import type { ProgressSnapshot } from '@/lib/spotlight/types';

interface ProgressBarProps {
  progress:   ProgressSnapshot;
  stepTitles: string[]; // display titles for each step (from group.title + 'Review')
}

export default function ProgressBar({ progress, stepTitles }: ProgressBarProps) {
  const { currentStep, totalSteps, percentage, isReviewStep } = progress;

  return (
    <div className="mb-6">
      {/* Step label row */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
            {isReviewStep ? 'Review' : `Step ${currentStep}`}
          </span>
          <span className="text-gray-300 text-xs">of {totalSteps}</span>
        </div>
        <span className="text-xs font-semibold text-gray-500">{percentage}%</span>
      </div>

      {/* Progress track */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#D4AF37] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="flex justify-between mt-2.5 px-0.5">
        {stepTitles.map((title, i) => {
          const stepNum   = i + 1;
          const isDone    = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div key={i} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
              <div className={clsx(
                'w-2 h-2 rounded-full transition-all duration-300 mx-auto',
                isDone    && 'bg-[#D4AF37]',
                isCurrent && 'bg-[#D4AF37] ring-2 ring-[#D4AF37]/30 scale-125',
                !isDone && !isCurrent && 'bg-gray-200',
              )} />
              <span className={clsx(
                'text-[0.55rem] text-center leading-tight hidden sm:block truncate max-w-[56px]',
                isCurrent ? 'text-[#D4AF37] font-semibold' : 'text-gray-400',
              )}>
                {title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
