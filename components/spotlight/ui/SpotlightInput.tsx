'use client';
// components/spotlight/ui/SpotlightInput.tsx
import { type InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface SpotlightInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:     string;
  helpText?:  string;
  error?:     string;
  charCount?: { current: number; max: number };
}

const SpotlightInput = forwardRef<HTMLInputElement, SpotlightInputProps>(
  ({ label, helpText, error, charCount, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-semibold text-gray-800 leading-snug">
            {label}
            {props.required && <span className="text-[#D4AF37] ml-1">*</span>}
          </label>
        )}

        <input
          ref={ref}
          className={clsx(
            'w-full px-4 py-3 rounded-xl border text-sm text-gray-900 bg-white',
            'transition-colors duration-150 outline-none',
            'placeholder:text-gray-400',
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
            <p className="text-gray-400 text-xs">{helpText}</p>
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
SpotlightInput.displayName = 'SpotlightInput';
export default SpotlightInput;
