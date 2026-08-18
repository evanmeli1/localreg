import { NextResponse } from 'next/server';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { getAdminClient, isAdminConfigured } from '@/lib/supabase-admin';
import { RATE_LIMITS, getClientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Verifies that a session_id in the /welcome URL corresponds to a real, paid
// Checkout Session that hasn't been used yet. Before this existed, any random
// string in the query param was enough to reach the intake form.
//
// Outcomes (always HTTP 200 so the client can render the right state):
//   ok                -> paid, unused; form may be shown. Returns customerId.
//   already_submitted -> a businesses row already exists for this session
//   unpaid            -> real session, payment not completed
//   invalid           -> unknown/malformed id, or a session from another account
//   unavailable       -> Stripe or Supabase not reachable/configured

export async function POST(request) {
  if (!isStripeConfigured || !isAdminConfigured) {
    return NextResponse.json({ status: 'unavailable' });
  }

  // Unauthenticated, and it spends a Stripe API call on anything shaped like a
  // session id, so it needs the same friction as the other public routes.
  // Answers in the documented { status } shape rather than the shared 429 body:
  // WelcomeForm switches on `status`, and an { error } payload would fall
  // through to its "no completed payment" gate, which would be a lie.
  const { limited, retryAfterSeconds } = rateLimit(
    'checkoutVerify',
    getClientIp(request),
    RATE_LIMITS.checkoutVerify,
  );
  if (limited) {
    return NextResponse.json(
      { status: 'unavailable' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'invalid' });
  }

  const sessionId = body?.session_id;
  if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
    // Every real Checkout Session id starts with cs_; reject obvious fakes
    // without spending a Stripe API call on them.
    return NextResponse.json({ status: 'invalid' });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    // resource_missing is the expected path for a fabricated id.
    if (error?.code !== 'resource_missing') {
      console.error('[checkout/verify] Stripe lookup failed:', error);
    }
    return NextResponse.json({ status: 'invalid' });
  }

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ status: 'unpaid' });
  }

  // One payment, one listing. The UNIQUE constraint on stripe_session_id is the
  // real enforcement; this check exists so a returning visitor sees a clear
  // "already submitted" message instead of a form that will fail on submit.
  const supabase = getAdminClient();
  const { data: existing, error } = await supabase
    .from('businesses')
    .select('id')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('[checkout/verify] Supabase lookup failed:', error);
    return NextResponse.json({ status: 'unavailable' });
  }

  if (existing) {
    return NextResponse.json({ status: 'already_submitted' });
  }

  return NextResponse.json({
    status: 'ok',
    // The authoritative customer id, so the intake form stops inventing a
    // placeholder and stores the value the Stripe webhooks will key on.
    customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
  });
}
