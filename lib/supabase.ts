// lib/supabase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Browser-side Supabase client + all shared TypeScript types.
//
// ARCHITECTURE NOTE:
//   - This file is used in Client Components ('use client')
//   - For Server Components, use lib/supabase-server.ts instead
//   - Never import supabase-server.ts in client code (it exposes service role key)
// ─────────────────────────────────────────────────────────────────────────────
import { createBrowserClient } from '@supabase/ssr';

// Singleton browser client — created once, reused everywhere on the client
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── DATABASE TYPES ────────────────────────────────────────────────────────
// These mirror the Supabase schema exactly.
// Update these whenever you add/change columns.

export type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  market_price: number | null;
  highlight: boolean;
  images: string[];
  created_at: string;
};

export type StoreItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  market_price: number | null;
  category: string | null;
  highlight: boolean;
  images: string[];
  created_at: string;
};

export type Promo = {
  id: string;
  title: string;
  message: string;
  active: boolean;
  created_at: string;
};

export type Review = {
  id: string;
  name: string | null;
  rating: number;
  comment: string;
  created_at: string;
};

export type Request = {
  id: string;
  item: string;
  price: number | null;
  source: string;
  status: string;
  agent_code: string | null;
  created_at: string;
};

export type Visit = {
  id: string;
  page: string;
  user_agent: string | null;
  created_at: string;
};

export type SiteSettings = {
  key: string;
  value: Record<string, string>;
};

export type Technician = {
  id: string;
  name: string;
  skills: string[];
  jobs_completed: number;
  rating: number;
  phone: string | null;
  active: boolean;
  created_at: string;
};

// ── UTILITY ───────────────────────────────────────────────────────────────
export function fmt(n: number): string {
  return n.toLocaleString('en-NG');
}
