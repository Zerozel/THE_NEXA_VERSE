// lib/spotlight/prompts/serviceHighlight.ts
import type { GenerationContext } from '../types';
import type { PromptBuilder } from './types';

export const SERVICE_HIGHLIGHT_VERSION = 'v1';

function build(ctx: GenerationContext): string {
  return `Write a focused piece (80-120 words) highlighting this person's service or offering for a community spotlight feature.

What they do: ${ctx.whatYouDo ?? 'Not provided.'}
What makes them different: ${ctx.whatMakesYouDifferent ?? 'Not provided.'}
Who they help: ${ctx.whoYouHelp ?? 'Not provided.'}
Skills: ${ctx.skills.length > 0 ? ctx.skills.join(', ') : 'Not provided.'}

Tone: clear, practical, useful to someone deciding whether to reach out. No hard sell.
Output only the highlight text, nothing else.`;
}

export const serviceHighlightPrompt: PromptBuilder = { version: SERVICE_HIGHLIGHT_VERSION, build };
