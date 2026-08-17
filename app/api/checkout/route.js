import { NextResponse } from 'next/server';
import { stripe, isStripeConfigured } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * Creates a Stripe Checkout Session for the $5/mo directory listing and hands
 * the hosted URL back to the browser to redirect to.
 *
 * The success URL carries {CHECKOUT_SESSION_ID}, which Stripe substitutes for
 * the real session id on redirect. /welcome then verifies that id server-side
 * before showing the intake form — the id in the URL is never trusted on its own.
 */
export async function POST() {
  if (!isStripeConfigured) {
    console.error('[checkout] STRIPE_SECRET_KEY or STRIPE_PRICE_ID missing');
    return NextResponse.json(
      { error: 'Payments are not configured yet.' },
      { status: 503 },
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.error('[checkout] NEXT_PUBLIC_SITE_URL missing');
    return NextResponse.json(
      { error: 'Payments are not configured yet.' },
      { status: 503 },
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${siteUrl}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Card errors can't happen here (no payment details yet) — this is
    // misconfiguration or a Stripe outage.
    console.error('[checkout] session creation failed:', error);
    return NextResponse.json(
      { error: 'Could not start checkout. Please try again.' },
      { status: 500 },
    );
  }
}
