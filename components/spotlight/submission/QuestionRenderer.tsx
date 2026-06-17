'use client';
// components/spotlight/submission/QuestionRenderer.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Renders a single question using the correct input component for its type.
// This is the extensibility point: add a new input_type here, nowhere else.
//
// VALIDATION RULES come from the question definition — never hardcoded.
// ─────────────────────────────────────────────────────────────────────────────
import type { SpotlightQuestion, AnswerValue } from '@/lib/spotlight/types';
import {
  SpotlightInput,
  SpotlightTextarea,
  SpotlightSelect,
  SpotlightMultiSelect,
  SpotlightTagInput,
} from '@/components/spotlight/ui';

interface QuestionRendererProps {
  question: SpotlightQuestion;
  value:    AnswerValue;
  error:    string | undefined;
  onChange: (key: string, value: AnswerValue) => void;
}

export default function QuestionRenderer({
  question, value, error, onChange,
}: QuestionRendererProps) {
  const { question_key, question_text, help_text, placeholder, input_type,
          options, is_required, max_length } = question;

  // Helpers to coerce value types safely
  const strVal  = typeof value === 'string'  ? value  : '';
  const arrVal  = Array.isArray(value)        ? value  : [];

  // Character count helper for text/textarea
  const charCount = max_length
    ? { current: strVal.length, max: max_length }
    : undefined;

  const commonProps = {
    label:    question_text,
    helpText: help_text ?? undefined,
    error,
    required: is_required,
    placeholder: placeholder ?? undefined,
  };

  switch (input_type) {
    // ── Single-line text inputs ───────────────────────────────────────────
    case 'text':
      return (
        <SpotlightInput
          {...commonProps}
          type="text"
          value={strVal}
          maxLength={max_length ?? undefined}
          charCount={charCount}
          onChange={e => onChange(question_key, e.target.value)}
        />
      );

    case 'email':
      return (
        <SpotlightInput
          {...commonProps}
          type="email"
          value={strVal}
          onChange={e => onChange(question_key, e.target.value)}
          autoComplete="email"
          inputMode="email"
        />
      );

    case 'phone':
      return (
        <SpotlightInput
          {...commonProps}
          type="tel"
          value={strVal}
          onChange={e => onChange(question_key, e.target.value)}
          autoComplete="tel"
          inputMode="tel"
        />
      );

    case 'url':
      return (
        <SpotlightInput
          {...commonProps}
          type="url"
          value={strVal}
          onChange={e => onChange(question_key, e.target.value)}
          inputMode="url"
          autoComplete="url"
        />
      );

    // ── Multi-line text ───────────────────────────────────────────────────
    case 'textarea':
      return (
        <SpotlightTextarea
          {...commonProps}
          value={strVal}
          rows={5}
          maxLength={max_length ?? undefined}
          charCount={charCount}
          onChange={e => onChange(question_key, e.target.value)}
        />
      );

    // ── Single choice ─────────────────────────────────────────────────────
    case 'select':
      return (
        <SpotlightSelect
          {...commonProps}
          value={strVal}
          options={options ?? []}
          onChange={val => onChange(question_key, val)}
        />
      );

    // ── Multiple choice ───────────────────────────────────────────────────
    case 'multiselect':
      return (
        <SpotlightMultiSelect
          {...commonProps}
          value={arrVal}
          options={options ?? []}
          onChange={vals => onChange(question_key, vals)}
        />
      );

    // ── Tags (skills) ─────────────────────────────────────────────────────
    case 'tags':
      return (
        <SpotlightTagInput
          {...commonProps}
          value={arrVal}
          onChange={tags => onChange(question_key, tags)}
        />
      );

    // ── Unknown type — graceful fallback ─────────────────────────────────
    default:
      return (
        <SpotlightTextarea
          {...commonProps}
          value={strVal}
          onChange={e => onChange(question_key, e.target.value)}
        />
      );
  }
}
