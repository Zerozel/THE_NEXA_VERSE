'use client';
// components/spotlight/ui/SpotlightSelect.tsx
import clsx from 'clsx';
import type { SelectOption } from '@/lib/spotlight/types';

interface SpotlightSelectProps {
  label?:    string;
  helpText?: string;
  error?:    string;
  value:     string;
  options:   SelectOption[];
  required?: boolean;
  onChange:  (value: string) => void;
}

export default function SpotlightSelect({
  label, helpText, error, value, options, required, onChange,
}: SpotlightSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold text-gray-800">
          {label}{required && <span className="text-[#D4AF37] ml-1">*</span>}
        </label>
      )}
      <div className="grid grid-cols-1 gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={clsx(
              'w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-150',
              value === opt.value
                ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-gray-900 font-semibold'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
            )}
          >
            <span className={clsx(
              'inline-block w-4 h-4 rounded-full border mr-3 shrink-0 align-middle transition-colors',
              value === opt.value
                ? 'border-[#D4AF37] bg-[#D4AF37]'
                : 'border-gray-300',
            )} />
            {opt.label}
          </button>
        ))}
      </div>
      <div className="min-h-[18px]">
        {error   && <p className="text-red-500 text-xs font-medium">{error}</p>}
        {!error && helpText && <p className="text-gray-400 text-xs">{helpText}</p>}
      </div>
    </div>
  );
}
