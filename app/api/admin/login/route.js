import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  checkAdminPassword,
  checkRateLimit,
  clearAttempts,
  createSessionToken,
  getClientIp,
  isSessionConfigured,
  recordFailedAttempt,
  sessionCookieOptions,
} from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// The only publicly reachable endpoint that accepts a guessable secret, so it
// is rate limited and every failure returns the same generic message.

export async function POST(request) {
  if (!isSessionConfigured || !process.env.ADMIN_PASSWORD) {
    console.error('[admin/login] SESSION_SECRET or ADMIN_PASSWORD not set');
    return NextResponse.json(
      { error: 'Admin access is not configured on the server.' },
      { status: 503 },
    );
  }

  const ip = getClientIp(request);

  const { limited, retryAfterSeconds } = checkRateLimit(ip);
  if (limited) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  // Constant-time comparison — see safeEqual in lib/adminAuth.js.
  if (!checkAdminPassword(body?.password)) {
    recordFailedAttempt(ip);
    // Deliberately generic: no hint about length, format, or how close it was,
    // and the same message whether the body was malformed or simply wrong.
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = createSessionToken();
  if (!token) {
    return NextResponse.json(
      { error: 'Admin access is not configured on the server.' },
      { status: 503 },
    );
  }

  clearAttempts(ip);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
