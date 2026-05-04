// middleware.ts (runs at the EDGE — before any page renders)
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS DOES:
//   1. Protects all /admin/* routes — unauthenticated users never receive
//      admin HTML. The check happens at the network edge, not in the browser.
//   2. Rate-limits the /api/track endpoint to prevent analytics spam.
//   3. Injects request timing for performance monitoring.
//
// WHY THIS MATTERS:
//   Client-side auth checks (like we had in v2) can be bypassed by disabling
//   JavaScript. This middleware runs BEFORE Next.js even renders the page,
//   making it truly server-enforced.
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// ── RATE LIMITING (in-memory, Edge-compatible) ────────────────────────────
// Simple token bucket: each IP gets 30 requests per minute to /api/track.
// For production at scale, replace with Upstash Redis.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= limit) return true;
  entry.count++;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // ── PERFORMANCE TIMING ─────────────────────────────────────────────────
  response.headers.set('x-request-start', Date.now().toString());

  // ── RATE LIMIT: analytics tracking endpoint ────────────────────────────
  if (pathname.startsWith('/api/track')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    if (isRateLimited(ip)) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }

  // ── ADMIN ROUTE PROTECTION ─────────────────────────────────────────────
  // Allow the login page itself to load (obviously)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => request.cookies.get(name)?.value,
          // Middleware can't set cookies directly — pass through
          set: (name, value, options) => {
            response.cookies.set({ name, value, ...options });
          },
          remove: (name, options) => {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // Not authenticated — redirect to login, preserve intended destination
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── REDIRECT: logged-in users away from login page ────────────────────
  if (pathname === '/admin/login') {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => request.cookies.get(name)?.value,
          set: (name, value, options) => { response.cookies.set({ name, value, ...options }); },
          remove: (name, options) => { response.cookies.set({ name, value: '', ...options }); },
        },
      }
    );
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  return response;
}

// Tell Next.js which paths this middleware should run on
export const config = {
  matcher: [
    '/admin/:path*',   // All admin pages
    '/api/track/:path*', // Tracking API
  ],
};
