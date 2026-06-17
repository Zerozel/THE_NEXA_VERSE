'use client';
// components/spotlight/ui/SpotlightCheckbox.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Large, tappable consent checkbox. Designed for mobile — the entire
// row is the tap target, not just the small checkbox square.
// ─────────────────────────────────────────────────────────────────────────────
import clsx from 'clsx';

interface SpotlightCheckboxProps {
  checked:  boolean;
  onChange: (checked: boolean) => void;
  label:    React.ReactNode;
  error?:   string;
}

export default function SpotlightCheckbox({
  checked, onChange, label, error,
}: SpotlightCheckboxProps) {
  return (
    <div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={clsx(
          'w-full flex items-start gap-3 text-left p-4 rounded-xl border transition-all duration-150',
          checked
            ? 'border-[#D4AF37] bg-[#D4AF37]/10'
            : error
              ? 'border-red-400 bg-red-50'
              : 'border-gray-200 bg-white hover:border-gray-300',
        )}
      >
        <span className={clsx(
          'shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 transition-colors',
          checked ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-300 bg-white',
        )}>
          {checked && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6L4.5 8.5L10 2.5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="text-sm text-gray-800 leading-relaxed font-medium">
          {label}
        </span>
      </button>
      {error && <p className="text-red-500 text-xs font-medium mt-1.5 px-1">{error}</p>}
    </div>
  );
}
