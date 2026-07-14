// lib/spotlight/prompts/channelLong.ts
import type { GenerationContext } from '../types';
import type { PromptBuilder } from './types';

export const CHANNEL_LONG_VERSION = 'v1';

function build(ctx: GenerationContext): string {
  const name = ctx.participantName ?? ctx.displayName ?? 'This community member';

  return `Write a formatted, longer-form post (200-300 words) suitable for a community broadcast channel, spotlighting ${name}.

Role: ${ctx.role ?? 'Not provided.'}
Location: ${ctx.location ?? 'Not provided.'}
Category: ${ctx.category ?? 'Not provided.'}
What they do: ${ctx.whatYouDo ?? 'Not provided.'}
What makes them different: ${ctx.whatMakesYouDifferent ?? 'Not provided.'}
Background: ${ctx.backgroundStory ?? 'Not provided.'}
Vision: ${ctx.yourVision ?? 'Not provided.'}
Skills: ${ctx.skills.length > 0 ? ctx.skills.join(', ') : 'Not provided.'}

Structure: short attention-grabbing opening line, 2-3 body paragraphs, closing line inviting the community to connect.
Tone: warm, professional, channel-appropriate (this will be broadcast to the full community, not a private chat).
Output only the post text, nothing else — no title, no markdown formatting.`;
}

export const channelLongPrompt: PromptBuilder = { version: CHANNEL_LONG_VERSION, build };
