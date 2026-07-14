// lib/spotlight/prompts/communityQuestion.ts
import type { GenerationContext } from '../types';
import type { PromptBuilder } from './types';

export const COMMUNITY_QUESTION_VERSION = 'v1';

function build(ctx: GenerationContext): string {
  return `Write one short, open-ended discussion question (under 25 words) to post alongside this person's community spotlight, designed to invite replies and engagement.

What they do: ${ctx.whatYouDo ?? 'Not provided.'}
Their message to the community: ${ctx.messageToCommunity ?? 'Not provided.'}
What they'd like to be remembered for: ${ctx.oneThingRemembered ?? 'Not provided.'}

Tone: curious, inviting, conversational.
Output only the question itself, nothing else.`;
}

export const communityQuestionPrompt: PromptBuilder = { version: COMMUNITY_QUESTION_VERSION, build };
