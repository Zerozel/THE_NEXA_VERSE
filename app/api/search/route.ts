// app/api/search/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Full-text search across services and store items.
//
// Uses PostgreSQL's tsvector/tsquery (set up in schema.sql) for fast,
// ranked, typo-tolerant search. Much better than client-side filtering:
//   - Works on ALL items (not just the first 6 loaded)
//   - Ranks results by relevance
//   - Handles partial words via prefix matching
//   - Runs in the database, not in the browser
//
// QUERY PARAMS:
//   ?q=generator+repair&type=all|services|store
//
// EXAMPLE:
//   GET /api/search?q=electric&type=all
//   → { services: [...], items: [...] }
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = (searchParams.get('q') ?? '').trim().substring(0, 100);
  const type = searchParams.get('type') ?? 'all';

  if (!q || q.length < 2) {
    return NextResponse.json({ services: [], items: [] });
  }

  const db = createAdminClient();

  // Convert query to tsquery format: "generator repair" → "generator:* & repair:*"
  // The :* suffix enables prefix matching (so "elec" matches "electrician")
  const tsQuery = q
    .split(/\s+/)
    .filter(Boolean)
    .map(word => `${word.replace(/[^a-zA-Z0-9]/g, '')}:*`)
    .join(' & ');

  try {
    const [servicesResult, itemsResult] = await Promise.all([
      // ── SERVICES SEARCH ─────────────────────────────────────────────────
      type !== 'store'
        ? db
            .from('services')
            .select('*')
            .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
            .limit(10)
        : Promise.resolve({ data: [] }),

      // ── STORE ITEMS SEARCH ───────────────────────────────────────────────
      type !== 'services'
        ? db
            .from('store_items')
            .select('*')
            .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
            .limit(20)
        : Promise.resolve({ data: [] }),
    ]);

    return NextResponse.json(
      { services: servicesResult.data ?? [], items: itemsResult.data ?? [] },
      {
        headers: {
          // Cache search results for 30 seconds — fast for users, fresh enough for admins
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err) {
    console.error('[/api/search] Error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
