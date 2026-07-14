// lib/spotlight/ai/config.ts
// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for provider and model selection. To switch the
// active provider in the future (OpenRouter, Claude, DeepSeek, GPT), change
// ACTIVE_PROVIDER here — nowhere else in the codebase names a model or
// hardcodes which provider is in use.
// ─────────────────────────────────────────────────────────────────────────────

export const AI_PROVIDERS = {
  GEMINI: 'gemini',
  // Future: OPENROUTER: 'openrouter', CLAUDE: 'claude', DEEPSEEK: 'deepseek', GPT: 'gpt'
} as const;

export type AIProviderName = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];

/** The single place the Gemini model name is written. */
export const GEMINI_MODEL = 'gemini-2.5-flash';

/** Which provider getAIProvider() resolves to. Change this to switch providers. */
export const ACTIVE_PROVIDER: AIProviderName = AI_PROVIDERS.GEMINI;

/** Hard timeout for any single generation call, regardless of provider. */
export const GENERATION_TIMEOUT_MS = 30_000;

/** Fallback generation params, used when a prompt builder doesn't override them. */
export const DEFAULT_GENERATION_PARAMS = {
  temperature: 0.7,
  maxOutputTokens: 1024,
};
