// lib/spotlight/prompts/types.ts
import type { GenerationContext } from '../types';

/**
 * Every prompt builder file exports one of these. `version` is stored
 * alongside every generated version's metadata, so a future prompt change
 * never silently reclassifies older content under a new prompt's identity.
 */
export type PromptBuilder = {
  version: string;
  build: (context: GenerationContext) => string;
};
