// lib/spotlight/prompts/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// THE single dispatch point from a ContentType to its PromptBuilder.
// generation.ts only ever calls getPromptBuilder() — it never imports an
// individual prompt file directly.
// ─────────────────────────────────────────────────────────────────────────────
import { CONTENT_TYPES, type ContentType } from '../contentTypes';
import type { PromptBuilder } from './types';
import { spotlightIntroPrompt }    from './spotlightIntro';
import { founderStoryPrompt }      from './founderStory';
import { serviceHighlightPrompt }  from './serviceHighlight';
import { communityQuestionPrompt } from './communityQuestion';
import { whatsappShortPrompt }     from './whatsappShort';
import { channelLongPrompt }       from './channelLong';

const PROMPT_BUILDERS: Record<ContentType, PromptBuilder> = {
  [CONTENT_TYPES.SPOTLIGHT_INTRO]:    spotlightIntroPrompt,
  [CONTENT_TYPES.FOUNDER_STORY]:      founderStoryPrompt,
  [CONTENT_TYPES.SERVICE_HIGHLIGHT]:  serviceHighlightPrompt,
  [CONTENT_TYPES.COMMUNITY_QUESTION]: communityQuestionPrompt,
  [CONTENT_TYPES.WHATSAPP_SHORT]:     whatsappShortPrompt,
  [CONTENT_TYPES.CHANNEL_LONG]:       channelLongPrompt,
};

export function getPromptBuilder(format: ContentType): PromptBuilder {
  return PROMPT_BUILDERS[format];
}
