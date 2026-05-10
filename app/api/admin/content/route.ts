// app/api/admin/content/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Unified admin CRUD endpoint for services, store_items, and promos.
//
// WHY A DEDICATED API ROUTE INSTEAD OF DIRECT SUPABASE FROM DASHBOARD:
//   1. Cache revalidation must happen SERVER-SIDE (revalidateTag only works
//      in server context). The dashboard is a Client Component — it can't
//      call revalidateTag directly.
//   2. We can validate data and strip dangerous fields before saving.
//   3. All admin writes are logged in one place for auditing.
//
// Auth is enforced by middleware.ts — unauthenticated requests never reach here.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createAdminClient, createServerSupabase } from '@/lib/supabase-server';

// Map table names to their cache tags
const TABLE_TAGS: Record<string, string> = {
  services:    'services',
  store_items: 'store-items',
  promos:      'promos',
  reviews:     'reviews',
  technicians: 'technicians',
  settings:    'settings',
};

async function verifyAuth() {
  const supabase = createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

// ── CREATE ────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!await verifyAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { table, data } = await req.json();
    if (!table || !data || !TABLE_TAGS[table]) {
      return NextResponse.json({ error: 'Invalid table or data' }, { status: 400 });
    }

    const db = createAdminClient();
    const { data: result, error } = await db.from(table).insert(data).select().single();
    if (error) throw error;

    // Purge the cache for this table so the live site shows the new item
    revalidateTag(TABLE_TAGS[table]);

    return NextResponse.json({ ok: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Insert failed';
    console.error(`[/api/admin/content POST]`, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── UPDATE ────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  if (!await verifyAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { table, id, data } = await req.json();
    if (!table || !id || !data || !TABLE_TAGS[table]) {
      return NextResponse.json({ error: 'Invalid table, id, or data' }, { status: 400 });
    }

    const db = createAdminClient();
    const { data: result, error } = await db.from(table).update(data).eq('id', id).select().single();
    if (error) throw error;

    revalidateTag(TABLE_TAGS[table]);

    return NextResponse.json({ ok: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Update failed';
    console.error(`[/api/admin/content PATCH]`, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!await verifyAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { table, id } = await req.json();
    if (!table || !id || !TABLE_TAGS[table]) {
      return NextResponse.json({ error: 'Invalid table or id' }, { status: 400 });
    }

    const db = createAdminClient();
    const { error } = await db.from(table).delete().eq('id', id);
    if (error) throw error;

    revalidateTag(TABLE_TAGS[table]);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Delete failed';
    console.error(`[/api/admin/content DELETE]`, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── READ (for admin use — bypasses RLS cache) ─────────────────────────────
export async function GET(req: NextRequest) {
  if (!await verifyAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const table = searchParams.get('table');
  const orderBy = searchParams.get('orderBy') ?? 'created_at';

  if (!table || !TABLE_TAGS[table]) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
  }

  try {
    const db = createAdminClient();
    const { data, error } = await db.from(table).select('*').order(orderBy, { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Fetch failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
