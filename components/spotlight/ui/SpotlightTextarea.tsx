'use client';
// components/spotlight/ui/SpotlightTextarea.tsx
import { type TextareaHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface SpotlightTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:     string;
  helpText?:  string;
  error?:     string;
  charCount?: { current: number; max: number };
}

const SpotlightTextarea = forwardRef<HTMLTextAreaElement, SpotlightTextareaProps>(
  ({ label, helpText, error, charCount, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-semibold text-gray-800 leading-snug">
            {label}
            {props.required && <span className="text-[#D4AF37] ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          rows={props.rows ?? 4}
          className={clsx(
            'w-full px-4 py-3 rounded-xl border text-sm text-gray-900 bg-white',
            'transition-colors duration-150 outline-none resize-none',
            'placeholder:text-gray-400 leading-relaxed',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
              : 'border-gray-200 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20',
            className,
          )}
          {...props}
        />

        <div className="flex justify-between items-start gap-2 min-h-[18px]">
          {error ? (
            <p className="text-red-500 text-xs font-medium">{error}</p>
          ) : helpText ? (
            <p className="text-gray-400 text-xs leading-relaxed">{helpText}</p>
          ) : (
            <span />
          )}
          {charCount && (
            <p className={clsx(
              'text-xs shrink-0',
              charCount.current > charCount.max ? 'text-red-500 font-medium' : 'text-gray-400',
            )}>
              {charCount.current}/{charCount.max}
            </p>
          )}
        </div>
      </div>
    );
  },
);
SpotlightTextarea.displayName = 'SpotlightTextarea';
export default SpotlightTextarea;
