// lib/spotlight/generation.ts
// ─────────────────────────────────────────────────────────────────────────────
// SERVER-ONLY. Business logic only — no UI, no HTTP concerns. The 7-step
// orchestration: load item → resolve type → load context → build prompt →
// call provider → insert version → update item. Operates on exactly one
// content item per call; nothing here ever touches a second one.
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAIProvider } from './ai/provider';
import { AIProviderError } from './ai/types';
import type { AIProvider } from './ai/types';
import { isValidContentType } from './contentTypes';
import type { ContentType } from './contentTypes';
import { getPromptBuilder } from './prompts';
import { buildGenerationContext, ContentContextError } from './contentContext';
import type { GenerationResult, GenerationErrorCode, GenerationMetadata } from './types';

export class GenerationServiceError extends Error {
  code: GenerationErrorCode;
  constructor(message: string, code: GenerationErrorCode) {
    super(message);
    this.code = code;
  }
}

/**
 * Generates content for exactly ONE content item.
 *
 * `provider` is injected, not constructed internally — production call
 * sites omit the third argument and get the real, configured provider via
 * getAIProvider(); tests pass a MockAIProvider and the entire path runs
 * with zero network calls. This is the testability seam the task asks for.
 *
 * Does NOT check or require status === 'pending_generation' beforehand —
 * see the design-decision note above. Every call creates a new version
 * and advances status to 'generated', regardless of the item's prior state.
 */
export async function generateContentItem(
  db: SupabaseClient,
  contentItemId: string,
  provider: AIProvider = getAIProvider(),
): Promise<GenerationResult> {

  // ── 1. Load content item ────────────────────────────────────────────────
  const { data: item, error: itemError } = await db
    .from('spotlight_content_items')
    .select('id, submission_id, format, status')
    .eq('id', contentItemId)
    .maybeSingle();

  if (itemError) {
    throw new GenerationServiceError('Database error while loading the content item.', 'provider_failure');
  }
  if (!item) {
    throw new GenerationServiceError('Content item not found.', 'missing_content_item');
  }

  // ── 2. Resolve content type ─────────────────────────────────────────────
  if (!isValidContentType(item.format)) {
    throw new GenerationServiceError(`Unrecognized content format: ${item.format}`, 'invalid_content_type');
  }
  const format = item.format as ContentType;

  // ── 3. Load generation context ──────────────────────────────────────────
  let context;
  try {
    context = await buildGenerationContext(db, item.submission_id);
  } catch (err) {
    if (err instanceof ContentContextError && err.code === 'missing_submission') {
      // Defensive only — submission_id has an ON DELETE CASCADE from
      // spotlight_submissions, so an orphaned content item is structurally
      // close to impossible. Kept anyway, per the required error code list.
      throw new GenerationServiceError('The submission for this content item no longer exists.', 'missing_submission');
    }
    throw new GenerationServiceError('Failed to load generation context.', 'provider_failure');
  }

  // ── 4. Build prompt ───────────────────────────────────────────────────────
  const builder = getPromptBuilder(format);
  let prompt: string;
  try {
    prompt = builder.build(context);
  } catch {
    throw new GenerationServiceError('Failed to build the generation prompt.', 'invalid_prompt');
  }
  if (!prompt || prompt.trim().length === 0) {
    throw new GenerationServiceError('Prompt builder produced an empty prompt.', 'invalid_prompt');
  }

  // ── 5. Call AI provider ─────────────────────────────────────────────────────
  const startedAt = Date.now();
  let aiResult;
  try {
    aiResult = await provider.generate({ prompt });
  } catch (err) {
    if (err instanceof AIProviderError) {
      throw new GenerationServiceError(err.message, err.code);
    }
    throw new GenerationServiceError('The AI provider call failed unexpectedly.', 'provider_failure');
  }
  const durationMs = Date.now() - startedAt;

  // Nothing has been written yet. If anything above threw, no version
  // exists and no content item was touched — "failures must not create
  // versions" holds because the insert hasn't happened yet.

  const metadata: GenerationMetadata = {
    provider: provider.name,
    model: provider.model,
    prompt_version: builder.version,
    generated_at: new Date().toISOString(),
    generation_duration_ms: durationMs,
  };

  // ── 6. Create content version — INSERT ONLY, never update ─────────────────
  const { data: newVersion, error: versionError } = await db
    .from('spotlight_content_versions')
    .insert({
      content_item_id: contentItemId,
      body: aiResult.text,
      is_generated: true,
      generation_metadata: metadata,
    })
    .select('id, version_number')
    .single();
  // version_number is assigned by the database trigger
  // (spotlight_assign_content_version_number) — never set it here.

  if (versionError || !newVersion) {
    throw new GenerationServiceError('Failed to save the generated content version.', 'provider_failure');
  }

  // ── 7. Update the content item to reflect its newest version ───────────────
  const { error: updateError } = await db
    .from('spotlight_content_items')
    .update({
      body: aiResult.text,
      status: 'generated',
      current_version: newVersion.version_number,
      generator_version: `${provider.name}:${provider.model}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contentItemId);

  if (updateError) {
    // The version above is already saved, append-only, and recoverable.
    // Logged loudly, not thrown — same precedent as Phase 4's review_logs
    // insert and Phase 5A's content-asset creation.
    console.error('[generateContentItem] content_items update failed after version was saved', updateError);
  }

  return {
    content_item_id: contentItemId,
    version_id: newVersion.id,
    version_number: newVersion.version_number,
    format,
    body: aiResult.text,
    status: 'generated',
    metadata,
  };
}
