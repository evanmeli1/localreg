import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

// SERVER-ONLY. Signed-cookie session auth for /admin.
//
// Hand-rolled rather than pulling in `jose`: the token is a single HMAC-signed
// payload, which node:crypto already does, so a JWT library would be pure
// dependency weight for no extra capability.
//
// Token format:  base64url(JSON payload) + "." + base64url(HMAC-SHA256)
// The payload is signed, NOT encrypted — it is readable by anyone holding the
// cookie. Never put a secret in it; it only asserts "this browser proved it
// knows the admin password before `exp`".

export const SESSION_COOKIE = 'localreg_admin_session';
export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60; // 24 hours

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  // Fail closed. A default value here would mean every deployment that forgot
  // to set SESSION_SECRET shares a publicly-known signing key, letting anyone
  // mint their own admin cookie.
  if (!secret) return null;
  return secret;
}

export const isSessionConfigured = Boolean(process.env.SESSION_SECRET);

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(data, secret) {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

/** Constant-time string compare that also avoids leaking length. */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  // Hashing first gives both sides a fixed 32-byte length, so timingSafeEqual
  // never throws on mismatched lengths and the comparison leaks nothing about
  // how long the real password is.
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Verifies a submitted admin password in constant time. */
export function checkAdminPassword(password) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof password !== 'string') return false;
  return safeEqual(password, expected);
}

/** Mints a signed session token. Returns null when SESSION_SECRET is unset. */
export function createSessionToken() {
  const secret = getSecret();
  if (!secret) return null;

  const issuedAt = Date.now();
  const payload = {
    role: 'admin',
    issuedAt,
    exp: issuedAt + SESSION_MAX_AGE_SECONDS * 1000,
  };

  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded, secret)}`;
}

/**
 * Verifies signature and expiry.
 * @returns {{role: string, issuedAt: number, exp: number}|null}
 */
export function verifySessionToken(token) {
  const secret = getSecret();
  if (!secret || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;
  // Compare signatures in constant time — a fast-exit compare here would let an
  // attacker discover a valid signature byte by byte.
  if (!safeEqual(signature, sign(encoded, secret))) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (payload?.role !== 'admin') return null;
  if (typeof payload.exp !== 'number' || Date.now() >= payload.exp) return null;

  return payload;
}

/** Cookie options shared by the login and logout routes. */
export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true, // unreadable from JavaScript, so XSS can't exfiltrate it
    secure: process.env.NODE_ENV === 'production', // relaxed on local http
    sameSite: 'strict', // not sent cross-site, which blocks CSRF on the admin routes
    path: '/',
    maxAge,
  };
}

/** Session for an API route (NextRequest). Returns null when absent/invalid. */
export function getSessionFromRequest(request) {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

/** Session for a server component. Returns null when absent/invalid. */
export async function getAdminSession() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

// ---------------------------------------------------------------------------
// Brute-force friction
//
// In-memory and per-process: it resets on restart and is not shared across
// instances, so it is friction rather than a guarantee. That is the right
// trade at this scale — /admin has exactly one user — but a distributed
// deployment would need Redis or a database-backed counter.
// ---------------------------------------------------------------------------

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

const attempts = new Map(); // ip -> { count, firstAt, lockedUntil }

export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

/** @returns {{limited: boolean, retryAfterSeconds: number}} */
export function checkRateLimit(ip) {
  const entry = attempts.get(ip);
  if (!entry) return { limited: false, retryAfterSeconds: 0 };

  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    return {
      limited: true,
      retryAfterSeconds: Math.ceil((entry.lockedUntil - Date.now()) / 1000),
    };
  }

  // Window elapsed with no lockout — forget the old attempts.
  if (Date.now() - entry.firstAt > ATTEMPT_WINDOW_MS) {
    attempts.delete(ip);
  }

  return { limited: false, retryAfterSeconds: 0 };
}

export function recordFailedAttempt(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now - entry.firstAt > ATTEMPT_WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAt: now, lockedUntil: 0 });
    return { remaining: MAX_FAILED_ATTEMPTS - 1 };
  }

  entry.count += 1;
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }

  return { remaining: Math.max(0, MAX_FAILED_ATTEMPTS - entry.count) };
}

export function clearAttempts(ip) {
  attempts.delete(ip);
}
