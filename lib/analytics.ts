// lib/analytics.ts
// ─────────────────────────────────────────────────────────────────────────────
// Client-side analytics helpers.
//
// WHY WE USE AN API ROUTE (/api/track) INSTEAD OF CALLING SUPABASE DIRECTLY:
//   1. The API route runs on the server — rate limiting and validation happen
//      there, not in user-controllable browser code.
//   2. We can batch multiple events without multiple round-trips.
//   3. The service role key (unrestricted DB access) stays server-side only.
//
// All functions are fire-and-forget: they never block the UI.
// ─────────────────────────────────────────────────────────────────────────────

async function post(body: Record<string, unknown>): Promise<void> {
  // Use navigator.sendBeacon when available — doesn't block page unload
  const payload = JSON.stringify(body);
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon('/api/track', payload);
  } else {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,  // keeps request alive even if page navigates away
    }).catch(() => {});
  }
}

/**
 * Track a page visit. Called once per session per page.
 * sessionStorage prevents double-counting on refresh.
 */
export function trackVisit(page: string): void {
  if (typeof window === 'undefined') return;
  const key = `nexa_v_${page}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  post({ type: 'visit', page, userAgent: navigator.userAgent });
}

/**
 * Track a service booking or product order.
 * These become the "Requests" in analytics.
 */
export function trackRequest(
  item: string,
  source: string,
  price?: number,
  agentCode?: string
): void {
  post({ type: 'request', item, source, price: price ?? null, agentCode: agentCode ?? null });
}
