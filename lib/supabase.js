import { createClient } from '@supabase/supabase-js';

// Public (anon) client. Safe to use in client components — the anon key is
// meant to ship to the browser and every query it makes is constrained by the
// RLS policies in supabase/migrations/001_init.sql:
//   businesses      SELECT where status = 'live', INSERT as 'pending'
//   change_requests INSERT only
//   events          no access
//
// For anything beyond that (approve/reject, reading the pending queue), go
// through a server-side API route that uses lib/supabase-admin.js.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False when env vars are missing, so the UI can say so instead of throwing. */
export const isSupabaseConfigured = Boolean(url && anonKey);

// createClient throws on an empty URL, so hold off until it's actually configured.
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, { auth: { persistSession: false } })
  : null;

/**
 * Turn any Supabase/network failure into a short message for the UI while
 * keeping the real error in the console for debugging.
 */
export function describeError(error, fallback = 'Something went wrong. Please try again.') {
  console.error('[supabase]', error);
  if (!error) return fallback;
  // 23505 = unique_violation. Callers that care handle it before reaching here.
  if (error.code === '23505') return 'That submission already exists.';
  if (error.message === 'Failed to fetch') {
    return 'Could not reach the server. Check your connection and try again.';
  }
  return fallback;
}
