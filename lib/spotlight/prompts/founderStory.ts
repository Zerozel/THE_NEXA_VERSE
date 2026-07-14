// lib/spotlight/prompts/founderStory.ts
import type { GenerationContext } from '../types';
import type { PromptBuilder } from './types';

export const FOUNDER_STORY_VERSION = 'v1';

function build(ctx: GenerationContext): string {
  const name = ctx.participantName ?? ctx.displayName ?? 'This person';

  return `Write a longer narrative piece (150-250 words) telling ${name}'s story for a community spotlight feature.

Background: ${ctx.backgroundStory ?? 'Not provided.'}
Origin story: ${ctx.originStory ?? 'Not provided.'}
Biggest challenge faced: ${ctx.biggestChallenge ?? 'Not provided.'}
Proudest moment: ${ctx.proudestMoment ?? 'Not provided.'}
What they do: ${ctx.whatYouDo ?? 'Not provided.'}

Tone: narrative, human, inspiring without being exaggerated. Write in third person.
Output only the story text, nothing else — no title, no headers.`;
}

export const founderStoryPrompt: PromptBuilder = { version: FOUNDER_STORY_VERSION, build };
