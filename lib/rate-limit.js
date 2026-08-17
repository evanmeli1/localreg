import { NextResponse } from 'next/server';

// Simple in-memory, per-IP rate limiter.
//
// ⚠️ REVISIT IF THIS SCALES. State lives in this process's memory, which means:
//   - it resets on every server restart or redeploy
//   - it is NOT shared across instances, so on serverless or multi-instance
//     hosting each instance keeps its own counter and the effective limit is
//     roughly (limit × instance count)
// That is acceptable at current scale — this is friction against casual abuse
// and accidental double-submits, not a security boundary. Moving to Redis or
// Upstash is the fix when this app runs on more than one instance; nothing
// else needs to change, since callers only use enforceRateLimit().

const buckets = new Map(); // `${name}:${ip}` -> number[] of request timestamps

export const RATE_LIMITS = {
  submission: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 listings/hour
  changeRequest: { limit: 10, windowMs: 60 * 60 * 1000 },
  checkout: { limit: 10, windowMs: 60 * 60 * 1000 }, // each call hits Stripe
};

/**
 * ⚠️ x-forwarded-for is client-supplied unless a trusted proxy overwrites it.
 * Behind Vercel/Cloudflare/nginx that is exactly what happens, so this is
 * correct in deployment. If this app is ever exposed directly to the internet,
 * an attacker can rotate the header to sidestep these limits — another reason
 * this is friction, not a security boundary.
 */
export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Records a hit and reports whether the caller is over the limit.
 * @returns {{limited: boolean, retryAfterSeconds: number, remaining: number}}
 */
export function rateLimit(name, ip, { limit, windowMs }) {
  const key = `${name}:${ip}`;
  const now = Date.now();
  const cutoff = now - windowMs;

  // Prune expired timestamps on read, which doubles as garbage collection —
  // no background timer needed.
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
    buckets.set(key, hits);
    return { limited: true, retryAfterSeconds, remaining: 0 };
  }

  hits.push(now);
  buckets.set(key, hits);

  // Keep the map from growing without bound on a long-running process.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => t <= cutoff)) buckets.delete(k);
    }
  }

  return { limited: false, retryAfterSeconds: 0, remaining: limit - hits.length };
}

/**
 * Convenience wrapper: returns a ready-made 429 response, or null to proceed.
 * @returns {NextResponse|null}
 */
export function enforceRateLimit(name, request) {
  const config = RATE_LIMITS[name];
  const { limited, retryAfterSeconds } = rateLimit(name, getClientIp(request), config);

  if (!limited) return null;

  return NextResponse.json(
    { error: 'Too many requests, try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}

/** Test-only: clears all buckets. */
export function __resetRateLimits() {
  buckets.clear();
}
