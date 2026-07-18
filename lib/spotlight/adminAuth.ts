// lib/spotlight/adminAuth.ts
// ─────────────────────────────────────────────────────────────────────────────
// SERVER-ONLY. Used by every /api/spotlight/admin/* route handler.
//
// Re-derives the Supabase session and verifies app_metadata.spotlight_admin
// === true — the EXACT same check the existing middleware already performs
// for page routes. This is not a new authorization system; it's the same
// check exposed as a reusable function, needed here for two reasons:
//   1. Defense-in-depth at the route level (middleware covers
//      /api/spotlight/admin/* too, after this phase's middleware update —
//      see below — but route-level checks never hurt).
//   2. The route needs the admin's user id for reviewer_id — middleware
//      alone can't hand that to a route handler without extra plumbing.
// ─────────────────────────────────────────────────────────────────────────────
import { createServerClient } from '@supabase/ssr';
import { cookies }            from 'next/headers';
import { NextResponse }       from 'next/server';

export class AdminAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export type SpotlightAdminUser = {
  id: string;
  email: string | null;
};

export async function requireSpotlightAdmin(): Promise<SpotlightAdminUser> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get:    (name) => cookieStore.get(name)?.value,
        set:    () => {},
        remove: () => {},
      },
    },
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new AdminAuthError('Not authenticated.', 401);

  const isSpotlightAdmin = session.user.app_metadata?.spotlight_admin === true;
  if (!isSpotlightAdmin) {
    throw new AdminAuthError('Not authorized for Spotlight admin actions.', 403);
  }

  return { id: session.user.id, email: session.user.email ?? null };
}

/** Converts an AdminAuthError (or anything else) into a JSON response. */
export function adminErrorResponse(err: unknown): NextResponse {
  if (err instanceof AdminAuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error('[admin route]', err);
  return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
}

/**
 * Validates the current user is a Spotlight admin AND returns their
 * identity for audit log writes. Call this in any route that needs to
 * record who performed an action.
 *
 * Throws AdminAuthError (same as requireSpotlightAdmin) on failure.
 * On success returns { id, email } for use in review log inserts.
 */
export async function getAuthenticatedAdmin(): Promise<{ id: string; email: string }> {
  const cookieStore = cookies();
  const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get:    (name) => cookieStore.get(name)?.value,
      set:    () => {},
      remove: () => {},
    },
  },
);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AdminAuthError('Not authenticated.', 401);
  }

  const isAdmin = user.app_metadata?.spotlight_admin === true;
  if (!isAdmin) {
    throw new AdminAuthError('Not authorized for Spotlight admin actions.', 403);
  }

  const email = user.email;
  if (!email) {
    throw new AdminAuthError('Admin account has no email address — cannot record reviewer identity.', 403);
  }

  return { id: user.id, email };
}
