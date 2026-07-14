// lib/spotlight/ai/geminiProvider.ts
// ─────────────────────────────────────────────────────────────────────────────
// SERVER-ONLY. The Gemini implementation of AIProvider. Never imported by
// any client component — GEMINI_API_KEY is read here and nowhere else.
// ─────────────────────────────────────────────────────────────────────────────
import { GEMINI_MODEL, GENERATION_TIMEOUT_MS, DEFAULT_GENERATION_PARAMS } from './config';
import { AIProviderError } from './types';
import type { AIProvider, AIGenerationRequest, AIGenerationResult } from './types';

const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** Strips a wrapping ```...``` fence if Gemini adds one despite instructions not to. */
function stripMarkdownFences(text: string): string {
  const fenced = text.match(/^```(?:\w+)?\n([\s\S]*?)\n```$/);
  return (fenced ? fenced[1] : text).trim();
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  readonly model = GEMINI_MODEL;

  async generate(request: AIGenerationRequest): Promise<AIGenerationResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AIProviderError('GEMINI_API_KEY is not configured on the server.', 'provider_failure', this.name);
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

    try {
      const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: request.prompt }] }],
          generationConfig: {
            temperature:     request.temperature     ?? DEFAULT_GENERATION_PARAMS.temperature,
            maxOutputTokens: request.maxOutputTokens  ?? DEFAULT_GENERATION_PARAMS.maxOutputTokens,
          },
        }),
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        throw new AIProviderError(
          `Gemini API responded with ${res.status}: ${bodyText.slice(0, 300)}`,
          'provider_failure',
          this.name,
        );
      }

      const data = await res.json();
      const text: unknown = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (typeof text !== 'string' || text.trim() === '') {
        throw new AIProviderError('Gemini returned an empty or malformed response.', 'provider_failure', this.name);
      }

      return { text: stripMarkdownFences(text), raw: data };

    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AIProviderError(`Gemini request exceeded ${GENERATION_TIMEOUT_MS}ms.`, 'generation_timeout', this.name);
      }
      throw new AIProviderError(
        `Gemini request failed: ${err instanceof Error ? err.message : String(err)}`,
        'provider_failure',
        this.name,
      );
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}
