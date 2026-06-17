// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient }             from '@supabase/ssr';

// ── RATE LIMITING ─────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  
  // Prevent memory leak by periodically cleaning up expired IPs
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetAt) rateLimitMap.delete(key);
  }

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
  let supabaseResponse = NextResponse.next({ request });

  // ── RATE LIMIT: analytics endpoint ───────────────────────────────────
  if (pathname.startsWith('/api/track')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    if (isRateLimited(ip)) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
    // If it's just the tracking API, we don't need to invoke Supabase auth
    return supabaseResponse;
  }

  // ── RATE LIMIT: draft creation endpoint ──────────────────────────────
  if (pathname.startsWith('/api/spotlight/drafts') && request.method === 'POST') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    if (isRateLimited(ip, 10, 60_000)) {  // 10 draft creations per minute per IP
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }

  // ── SUPABASE INITIALIZATION ──────────────────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Update the request object so subsequent checks have the new cookie
          request.cookies.set({ name, value, ...options });
          // Update the response object so the browser gets the new cookie
          supabaseResponse = NextResponse.next({
            request: { headers: request.headers },
          });
          supabaseResponse.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options });
          supabaseResponse = NextResponse.next({
            request: { headers: request.headers },
          });
          supabaseResponse.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Use getUser() instead of getSession() for secure server-side validation
  const { data: { user } } = await supabase.auth.getUser();

  // Helper function to persist refreshed auth cookies during redirects
  const redirectWithCookies = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  };

  // ── NEXA ADMIN PROTECTION (/admin/*) ─────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      if (user) return redirectWithCookies(new URL('/admin/dashboard', request.url));
    } else {
      if (!user) {
        const url = new URL('/admin/login', request.url);
        url.searchParams.set('redirect', pathname);
        return redirectWithCookies(url);
      }
    }
  }

  // ── SPOTLIGHT ADMIN PROTECTION (/spotlight/admin/*) ───────────────────
  if (pathname.startsWith('/spotlight/admin')) {
    const isSpotlightAdmin = user?.app_metadata?.spotlight_admin === true;

    if (pathname === '/spotlight/admin/login') {
      if (isSpotlightAdmin) return redirectWithCookies(new URL('/spotlight/admin', request.url));
    } else {
      if (!user) {
        const url = new URL('/spotlight/admin/login', request.url);
        url.searchParams.set('redirect', pathname);
        return redirectWithCookies(url);
      }
      
      if (!isSpotlightAdmin) {
        return redirectWithCookies(new URL('/spotlight', request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/spotlight/admin/:path*',
    '/api/track/:path*',
    '/api/spotlight/drafts/:path*',   
  ],
};
