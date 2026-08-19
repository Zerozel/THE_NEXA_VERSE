// app/api/spotlight/admin/content/generate-all/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/spotlight/admin/content/generate-all
// Body: { submissionId: string }
// Generates all pending content items for a submission sequentially.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getAuthenticatedAdmin, adminErrorResponse } from '@/lib/spotlight/adminAuth';
import { generateContentItem } from '@/lib/spotlight/generation';
import { getAIProvider } from '@/lib/spotlight/ai/provider';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    await getAuthenticatedAdmin();
  } catch (err) {
    return adminErrorResponse(err);
  }

  let body: { submissionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.', code: 'invalid_input' },
      { status: 400 }
    );
  }

  const { submissionId } = body;
  if (!submissionId || !UUID_RE.test(submissionId)) {
    return NextResponse.json(
      { error: 'Valid submissionId is required.', code: 'invalid_input' },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  // Get all content items for this submission that are pending generation or need revision
  const { data: items, error } = await db
    .from('spotlight_content_items')
    .select('id, format, status')
    .eq('submission_id', submissionId)
    .in('status', ['pending_generation', 'needs_revision'])
    .order('format');

  if (error) {
    console.error('[generate-all] Fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content items.', code: 'server_error' },
      { status: 500 }
    );
  }

  if (!items || items.length === 0) {
    return NextResponse.json({
      ok: true,
      generated: [],
      message: 'No content items pending generation.',
      total: 0,
      succeeded: 0,
      failed: 0,
    });
  }

  const provider = getAIProvider();
  const results: Array<{ id: string; format: string; version_id?: string; version_number?: number; error?: string }> = [];

  // Generate sequentially with delays to avoid rate limits
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      console.log(`[generate-all] Generating ${item.format} (${i + 1}/${items.length})...`);
      
      const result = await generateContentItem(db, item.id, provider);
      
      results.push({
        id: item.id,
        format: item.format,
        version_id: result.version_id,
        version_number: result.version_number,
      });
      
      console.log(`[generate-all] ✓ ${item.format} generated (v${result.version_number})`);
    } catch (err) {
      console.error(`[generate-all] ✗ ${item.format} failed:`, err);
      results.push({
        id: item.id,
        format: item.format,
        error: err instanceof Error ? err.message : 'Generation failed',
      });
    }

    // Small delay between generations to avoid rate limits
    if (i < items.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const succeeded = results.filter(r => r.version_id).length;
  const failed = results.filter(r => r.error).length;

  return NextResponse.json({
    ok: true,
    generated: results,
    total: items.length,
    succeeded,
    failed,
    message: failed === 0 
      ? `All ${succeeded} content items generated successfully!`
      : `${succeeded} generated, ${failed} failed. Check individual items for details.`,
  });
}
