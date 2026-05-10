// lib/supabase-server.ts
// ─────────────────────────────────────────────────────────────────────────────
// Server-side Supabase clients + CACHED DATA FETCHERS.
//
// THE CACHING STRATEGY (critical for performance):
//   - `unstable_cache` wraps Supabase queries so they run ONCE per interval
//     instead of once per visitor. On a busy campus network this is the
//     difference between 1 DB query/minute vs 1 query/second.
//   - Cache tags allow on-demand revalidation: when admin saves a service,
//     the 'services' cache tag is purged instantly.
//   - Revalidation periods are tuned per data type:
//     • Settings: 5 minutes (rarely change)
//     • Services/Store: 2 minutes (admin might update)
//     • Promos: 1 minute (time-sensitive)
//     • Reviews: 3 minutes (not urgent)
// ─────────────────────────────────────────────────────────────────────────────
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { unstable_cache } from 'next/cache';
import type { Service, StoreItem, Promo, Review, SiteSettings } from './supabase';

// ── SESSION-AWARE CLIENT (reads auth cookies) ─────────────────────────────
// Use this in Server Components that need to know who the user is.
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          cookieStore.set({ name, value, ...options });
        },
        remove: (name: string, options: CookieOptions) => {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

// ── SERVICE ROLE CLIENT (bypasses RLS — NEVER expose to browser) ──────────
// Use this only in server-side admin API routes that need unrestricted access.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ── ANONYMOUS SERVER CLIENT (for cached public data) ─────────────────────
// Used inside unstable_cache callbacks — no cookie context needed.
function serverClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CACHED FETCHERS
// Each function is wrapped in unstable_cache with:
//   - A unique cache key array
//   - A tag for on-demand revalidation (call revalidateTag('services') after admin save)
//   - A revalidate interval as a safety net
// ─────────────────────────────────────────────────────────────────────────────

export const getServices = unstable_cache(
  async (): Promise<Service[]> => {
    const { data } = await serverClient()
      .from('services')
      .select('*')
      .order('name');
    return data ?? [];
  },
  ['services'],
  { tags: ['services'], revalidate: 120 }  // 2 minutes
);

export const getStoreItems = unstable_cache(
  async (): Promise<StoreItem[]> => {
    const { data } = await serverClient()
      .from('store_items')
      .select('*')
      .order('name');
    return data ?? [];
  },
  ['store-items'],
  { tags: ['store-items'], revalidate: 120 }
);

export const getActivePromo = unstable_cache(
  async (): Promise<Promo | null> => {
    const { data } = await serverClient()
      .from('promos')
      .select('*')
      .eq('active', true)
      .limit(1)
      .single();
    return data ?? null;
  },
  ['active-promo'],
  { tags: ['promos'], revalidate: 60 }  // 1 minute
);

export const getTopReviews = unstable_cache(
  async (): Promise<Review[]> => {
    const { data } = await serverClient()
      .from('reviews')
      .select('*')
      .order('rating', { ascending: false })
      .limit(6);
    return data ?? [];
  },
  ['top-reviews'],
  { tags: ['reviews'], revalidate: 180 }  // 3 minutes
);

export const getSetting = unstable_cache(
  async (key: string): Promise<Record<string, string> | null> => {
    const { data } = await serverClient()
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();
    return data?.value ?? null;
  },
  ['settings'],
  { tags: ['settings'], revalidate: 300 }  // 5 minutes
);

export const getAllSettings = unstable_cache(
  async (): Promise<Record<string, Record<string, string>>> => {
    const { data } = await serverClient().from('settings').select('*');
    const map: Record<string, Record<string, string>> = {};
    data?.forEach(row => { map[row.key] = row.value; });
    return map;
  },
  ['all-settings'],
  { tags: ['settings'], revalidate: 300 }
);

// ── ANALYTICS (not cached — needs fresh data) ─────────────────────────────
// Paginated: pass page number (0-indexed) and page size
export async function getRequestsPage(page = 0, pageSize = 50) {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, count } = await serverClient()
    .from('requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  return { data: data ?? [], total: count ?? 0, page, pageSize };
}

export async function getVisitsPage(page = 0, pageSize = 50) {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, count } = await serverClient()
    .from('visits')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  return { data: data ?? [], total: count ?? 0, page, pageSize };
}

export async function getAnalyticsKpis() {
  const [visits, requests, reviews] = await Promise.all([
    serverClient().from('visits').select('id', { count: 'exact', head: true }),
    serverClient().from('requests').select('id', { count: 'exact', head: true }),
    serverClient().from('reviews').select('rating'),
  ]);
  const avgRating = reviews.data?.length
    ? (reviews.data.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.data.length).toFixed(1)
    : '0.0';
  return {
    totalVisits: visits.count ?? 0,
    totalRequests: requests.count ?? 0,
    totalReviews: reviews.data?.length ?? 0,
    avgRating,
  };
}

export async function getChartData() {
  // Last 30 days of daily visit + request counts
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString();

  const [visitRows, reqRows] = await Promise.all([
    serverClient().from('visits').select('created_at').gte('created_at', cutoffStr),
    serverClient().from('requests').select('created_at').gte('created_at', cutoffStr),
  ]);

  function toDateMap(rows: { created_at: string }[]): Record<string, number> {
    const map: Record<string, number> = {};
    rows.forEach(r => {
      const key = new Date(r.created_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
      map[key] = (map[key] ?? 0) + 1;
    });
    return map;
  }

  const labels = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  });

  const visitMap = toDateMap(visitRows.data ?? []);
  const reqMap   = toDateMap(reqRows.data ?? []);

  return {
    labels,
    visits:   labels.map(l => visitMap[l] ?? 0),
    requests: labels.map(l => reqMap[l] ?? 0),
  };
}
