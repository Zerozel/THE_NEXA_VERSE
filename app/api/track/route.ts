// app/api/track/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Server-side analytics ingestion endpoint.
//
// Receives visit + request events from the client, validates them,
// then writes to Supabase using the service role (bypasses RLS).
//
// Protected by middleware rate limiting (30 req/min per IP).
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body;
    const db = createAdminClient();

    if (type === 'visit') {
      const { page, userAgent } = body;
      if (!page || typeof page !== 'string') {
        return NextResponse.json({ error: 'Invalid page' }, { status: 400 });
      }
      await db.from('visits').insert({
        page: page.substring(0, 100),
        user_agent: userAgent ? String(userAgent).substring(0, 300) : null,
      });
      return NextResponse.json({ ok: true });
    }

    if (type === 'request') {
      const { item, source, price, agentCode } = body;
      if (!item || typeof item !== 'string') {
        return NextResponse.json({ error: 'Invalid item' }, { status: 400 });
      }
      await db.from('requests').insert({
        item: item.substring(0, 200),
        source: source ? String(source).substring(0, 100) : 'unknown',
        price: typeof price === 'number' ? price : null,
        agent_code: agentCode ? String(agentCode).substring(0, 50) : null,
        status: 'new',
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown event type' }, { status: 400 });

  } catch (err) {
    console.error('[/api/track] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Only POST is valid — reject everything else
export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
