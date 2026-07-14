// lib/spotlight/ai/provider.ts
// ─────────────────────────────────────────────────────────────────────────────
// THE ONLY function business logic may call to obtain a provider instance.
// generation.ts must never import GeminiProvider (or any future provider
// class) directly — only this factory, which reads config.ts to decide
// which one to construct.
// ─────────────────────────────────────────────────────────────────────────────
import { ACTIVE_PROVIDER, AI_PROVIDERS } from './config';
import { GeminiProvider } from './geminiProvider';
import type { AIProvider } from './types';

export function getAIProvider(): AIProvider {
  switch (ACTIVE_PROVIDER) {
    case AI_PROVIDERS.GEMINI:
      return new GeminiProvider();
    // Future cases: OpenRouter, Claude, DeepSeek, GPT — add a case here
    // and a provider class file; nothing else in the codebase changes.
    default:
      throw new Error(`Unknown AI provider configured: ${ACTIVE_PROVIDER}`);
  }
}
