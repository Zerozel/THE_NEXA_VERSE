// lib/spotlight/prompts/whatsappShort.ts
import type { GenerationContext } from '../types';
import type { PromptBuilder } from './types';

export const WHATSAPP_SHORT_VERSION = 'v1';

function build(ctx: GenerationContext): string {
  const name = ctx.participantName ?? ctx.displayName ?? 'A community member';

  return `Write a WhatsApp status-length summary (strictly under 140 characters total) introducing ${name} for a community spotlight.

What they do: ${ctx.whatYouDo ?? ctx.businessName ?? 'Not provided.'}
Category: ${ctx.category ?? 'Not provided.'}

Tone: punchy, casual, scannable in a few seconds. No hashtags.
Output only the status text, nothing else.`;
}

export const whatsappShortPrompt: PromptBuilder = { version: WHATSAPP_SHORT_VERSION, build };
