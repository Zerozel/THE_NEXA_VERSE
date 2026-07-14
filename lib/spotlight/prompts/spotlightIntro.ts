// lib/spotlight/prompts/spotlightIntro.ts
import type { GenerationContext } from '../types';
import type { PromptBuilder } from './types';

export const SPOTLIGHT_INTRO_VERSION = 'v1';

function build(ctx: GenerationContext): string {
  const name     = ctx.participantName ?? ctx.displayName ?? 'this community member';
  const category = ctx.category ?? 'a community member';
  const what     = ctx.whatYouDo ?? ctx.businessName ?? 'their work';

  return `Write a short, warm introduction post (2-3 sentences, under 60 words) for a community spotlight feature.

Subject: ${name}
Category: ${category}
What they do: ${what}

Tone: welcoming, genuine, community-oriented. No hashtags, no emojis, no marketing language.
Output only the introduction text, nothing else.`;
}

export const spotlightIntroPrompt: PromptBuilder = { version: SPOTLIGHT_INTRO_VERSION, build };
