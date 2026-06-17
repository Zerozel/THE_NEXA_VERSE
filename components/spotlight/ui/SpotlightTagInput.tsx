'use client';
// components/spotlight/ui/SpotlightTagInput.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Used for the "skills" question (input_type: 'tags').
// User types a skill and presses Enter or comma to add it.
// Tags can be removed by clicking ×.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, KeyboardEvent } from 'react';
import clsx from 'clsx';

const MAX_TAGS = 8;

interface SpotlightTagInputProps {
  label?:      string;
  helpText?:   string;
  error?:      string;
  placeholder?: string;
  value:       string[];
  required?:   boolean;
  onChange:    (tags: string[]) => void;
}

export default function SpotlightTagInput({
  label, helpText, error, placeholder, value, required, onChange,
}: SpotlightTagInputProps) {
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag || value.includes(tag) || value.length >= MAX_TAGS) return;
    onChange([...value, tag]);
    setInputVal('');
  }

  function removeTag(tag: string) {
    onChange(value.filter(t => t !== tag));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputVal);
    }
    if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold text-gray-800">
          {label}{required && <span className="text-[#D4AF37] ml-1">*</span>}
        </label>
      )}

      {/* Tag container */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={clsx(
          'min-h-[52px] w-full px-3 py-2 rounded-xl border bg-white cursor-text',
          'flex flex-wrap gap-2 items-center transition-colors duration-150',
          error
            ? 'border-red-400 focus-within:ring-2 focus-within:ring-red-100'
            : 'border-gray-200 focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/20',
        )}
      >
        {value.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-[#D4AF37]/15 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="text-gray-500 hover:text-red-500 transition-colors leading-none"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        {value.length < MAX_TAGS && (
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => { if (inputVal.trim()) addTag(inputVal); }}
            placeholder={value.length === 0 ? (placeholder ?? 'Type a skill, press Enter…') : 'Add another…'}
            className="flex-1 min-w-[140px] outline-none text-sm text-gray-900 bg-transparent placeholder:text-gray-400"
          />
        )}
      </div>

      <div className="flex justify-between min-h-[18px]">
        {error   && <p className="text-red-500 text-xs font-medium">{error}</p>}
        {!error && helpText && <p className="text-gray-400 text-xs">{helpText}</p>}
        {!error && !helpText && <span />}
        <p className="text-gray-400 text-xs shrink-0">{value.length}/{MAX_TAGS}</p>
      </div>
    </div>
  );
}
