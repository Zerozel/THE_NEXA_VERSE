// app/api/spotlight/admin/content/[id]/generate/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/spotlight/admin/content/[id]/generate
// Triggers generation for exactly one content item. Admin-only. Already
// covered by Phase 4's '/api/spotlight/admin/:path*' middleware matcher —
// no middleware changes needed. No bulk variant exists.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { requireSpotlightAdmin, adminErrorResponse } from '@/lib/spotlight/adminAuth';
import { generateContentItem, GenerationServiceError } from '@/lib/spotlight/generation';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function statusForCode(code: string): number {
  if (code === 'missing_content_item' || code === 'missing_submission') return 404;
  if (code === 'generation_timeout') return 504;
  return 502; // provider_failure, invalid_content_type, invalid_prompt
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    await requireSpotlightAdmin();
  } catch (err) {
    return adminErrorResponse(err);
  }

  const { id } = params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid content item id.', code: 'invalid_input' }, { status: 400 });
  }

  const db = createAdminClient();

  try {
    const result = await generateContentItem(db, id);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    if (err instanceof GenerationServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusForCode(err.code) },
      );
    }
    console.error('[POST .../content/[id]/generate]', err);
    return NextResponse.json(
      { error: 'Generation failed unexpectedly.', code: 'provider_failure' },
      { status: 500 },
    );
  }
}
