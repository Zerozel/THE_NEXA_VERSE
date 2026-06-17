'use client';
// components/spotlight/ui/SpotlightMultiSelect.tsx
import clsx from 'clsx';
import type { SelectOption } from '@/lib/spotlight/types';

interface SpotlightMultiSelectProps {
  label?:    string;
  helpText?: string;
  error?:    string;
  value:     string[];
  options:   SelectOption[];
  required?: boolean;
  onChange:  (value: string[]) => void;
}

export default function SpotlightMultiSelect({
  label, helpText, error, value, options, required, onChange,
}: SpotlightMultiSelectProps) {

  function toggle(opt: string) {
    onChange(
      value.includes(opt)
        ? value.filter(v => v !== opt)
        : [...value, opt],
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold text-gray-800">
          {label}{required && <span className="text-[#D4AF37] ml-1">*</span>}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const selected = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={clsx(
                'px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-150',
                selected
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-gray-900'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
              )}
            >
              {selected && <span className="mr-1.5">✓</span>}
              {opt.label}
            </button>
          );
        })}
      </div>
      <div className="min-h-[18px]">
        {error   && <p className="text-red-500 text-xs font-medium">{error}</p>}
        {!error && helpText && <p className="text-gray-400 text-xs">{helpText}</p>}
      </div>
    </div>
  );
}
