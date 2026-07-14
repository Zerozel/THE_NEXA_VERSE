// lib/spotlight/ai/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// THE PROVIDER ABSTRACTION CONTRACT.
// Every AI provider (Gemini today; OpenRouter, Claude, DeepSeek, GPT later)
// implements this exact interface. Business logic (generation.ts) only
// ever talks to this interface — never to a provider class by name.
// ─────────────────────────────────────────────────────────────────────────────

export type AIGenerationRequest = {
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
};

export type AIGenerationResult = {
  text: string;
  /** Provider's raw response — for debugging only. Never persisted. */
  raw?: unknown;
};

export type AIProviderErrorCode = 'provider_failure' | 'generation_timeout';

export class AIProviderError extends Error {
  code: AIProviderErrorCode;
  provider: string;

  constructor(message: string, code: AIProviderErrorCode, provider: string) {
    super(message);
    this.name = 'AIProviderError';
    this.code = code;
    this.provider = provider;
  }
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generate(request: AIGenerationRequest): Promise<AIGenerationResult>;
}
