// app/api/settings/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Settings save endpoint with on-demand cache revalidation.
//
// WHY THIS EXISTS:
//   When an admin saves a new WhatsApp number or hero image, the old cached
//   version is stale. We call revalidateTag('settings') here to instantly
//   purge the cache — the next visitor gets fresh data.
//
//   This is the "revalidate on demand" pattern:
//   Static cache (fast) + instant updates (correct) = best of both worlds.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createAdminClient, createServerSupabase } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  // Verify the caller is authenticated
  const supabase = createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { key, value, table } = await req.json();

    const db = createAdminClient();

    // ── SETTINGS SAVE ──────────────────────────────────────────────────────
    if (key && value) {
      await db.from('settings').upsert({ key, value }, { onConflict: 'key' });
      revalidateTag('settings');
    }

    // ── CONTENT TABLE REVALIDATION ─────────────────────────────────────────
    // When admin saves a service, service page cache must purge
    if (table === 'services')    revalidateTag('services');
    if (table === 'store_items') revalidateTag('store-items');
    if (table === 'promos')      revalidateTag('promos');
    if (table === 'reviews')     revalidateTag('reviews');

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/settings] Error:', err);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}
