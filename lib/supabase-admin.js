import { createClient } from '@supabase/supabase-js';

// ⚠️  SERVER-ONLY. DO NOT IMPORT THIS FROM A CLIENT COMPONENT. ⚠️
//
// SUPABASE_SERVICE_ROLE_KEY bypasses Row Level Security completely — it can
// read every pending listing's contact email, flip any row to 'live', and
// delete anything. If this module is ever pulled into a file with 'use client'
// (or into any module that one imports), the key is bundled and served to every
// visitor, and the whole RLS model is void.
//
// Import it only from:
//   - app/api/**/route.js
//   - server components / server actions
//
// The guard below turns that mistake into an immediate crash rather than a
// silent, quiet leak.

if (typeof window !== 'undefined') {
  throw new Error(
    'lib/supabase-admin.js was imported in the browser. This module holds the ' +
      'service role key and must stay server-side.',
  );
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isAdminConfigured = Boolean(url && serviceRoleKey);

/**
 * Built lazily so a missing key surfaces as a clean 500 from the API route
 * instead of blowing up at module-load time and taking the whole build with it.
 */
export function getAdminClient() {
  if (!isAdminConfigured) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Admin authentication lives in lib/adminAuth.js (signed session cookie +
// constant-time password comparison). It deliberately does not live here.
