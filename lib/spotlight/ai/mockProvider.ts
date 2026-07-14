// lib/spotlight/ai/mockProvider.ts
// ─────────────────────────────────────────────────────────────────────────────
// A ready-made AIProvider implementation for tests. Makes zero network
// calls. Pass an instance of this directly into generateContentItem()'s
// third argument to test the full generation path without touching Gemini.
//
//   const mock = new MockAIProvider({ response: 'Sample generated text.' });
//   const result = await generateContentItem(testDb, contentItemId, mock);
//
//   const failing = new MockAIProvider({ shouldFail: true });
//   await expect(generateContentItem(testDb, contentItemId, failing))
//     .rejects.toThrow();
// ─────────────────────────────────────────────────────────────────────────────
import { AIProviderError } from './types';
import type { AIProvider, AIGenerationRequest, AIGenerationResult } from './types';

export class MockAIProvider implements AIProvider {
  readonly name = 'mock';
  readonly model = 'mock-1.0';

  private response: string;
  private shouldFail: boolean;

  constructor(options: { response?: string; shouldFail?: boolean } = {}) {
    this.response   = options.response ?? 'This is a mock generated response.';
    this.shouldFail = options.shouldFail ?? false;
  }

  async generate(_request: AIGenerationRequest): Promise<AIGenerationResult> {
    if (this.shouldFail) {
      throw new AIProviderError('Mock provider configured to fail.', 'provider_failure', this.name);
    }
    return { text: this.response };
  }
}
