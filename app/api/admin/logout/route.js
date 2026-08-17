import { NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * Clears the session cookie. Overwrites it with an empty, immediately-expired
 * cookie carrying the same attributes — a browser only replaces a cookie when
 * name, path and domain all match.
 *
 * The token itself stays cryptographically valid until its `exp`; there is no
 * server-side revocation list. At one-admin scale that is an acceptable trade,
 * but a stolen cookie cannot be killed early — rotating SESSION_SECRET
 * invalidates every outstanding session at once if that is ever needed.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  return response;
}
