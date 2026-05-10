// app/api/health/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Health check endpoint. Returns 200 when the app is alive.
//
// USE CASES:
//   1. Uptime monitors (e.g. UptimeRobot) ping this every 5 minutes
//   2. Prevents Supabase free tier from pausing (project stays active)
//   3. Load balancers use this to know which instances are healthy
//
// HOW TO SET UP FREE MONITORING:
//   UptimeRobot.com → New Monitor → HTTP(s) → URL: yoursite.com/api/health
//   Interval: every 5 minutes → get email when down
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic'; // Never cache this

export async function GET() {
  const start = Date.now();

  try {
    // Quick DB ping — just count settings rows (very fast)
    const db = createAdminClient();
    const { error } = await db.from('settings').select('key', { count: 'exact', head: true });

    if (error) throw error;

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: 'connected',
      latency_ms: Date.now() - start,
      version: '3.0',
    });
  } catch (err) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      db: 'disconnected',
      error: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 503 });
  }
}
