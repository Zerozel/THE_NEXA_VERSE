// lib/spotlight/supabaseBrowser.ts
// ─────────────────────────────────────────────────────────────────────────────
// Minimal browser Supabase client, used only by the Spotlight admin login
// page. Kept inside lib/spotlight/ so this package has no dependency on
// the exact shape of your existing Nexa browser client file — drop this
// in alongside everything else and it works standalone.
// ─────────────────────────────────────────────────────────────────────────────
import { createBrowserClient } from '@supabase/ssr';

export const spotlightSupabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
