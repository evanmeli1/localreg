import Stripe from 'stripe';

// ⚠️ SERVER-ONLY. STRIPE_SECRET_KEY can create charges, read customers and
// issue refunds. Never import this from a client component — the publishable
// key (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) is the browser-safe one.

if (typeof window !== 'undefined') {
  throw new Error(
    'lib/stripe.js was imported in the browser. This module holds the secret ' +
      'key and must stay server-side.',
  );
}

const secretKey = process.env.STRIPE_SECRET_KEY;

export const isStripeConfigured = Boolean(secretKey && process.env.STRIPE_PRICE_ID);

// No explicit apiVersion: the SDK pins itself to the version it was built
// against, which is what Stripe recommends unless you deliberately need to
// hold an older one.
export const stripe = secretKey ? new Stripe(secretKey) : null;

/** True when the configured key is a live-mode key — used to keep test flows honest. */
export const isLiveMode = Boolean(secretKey && secretKey.startsWith('sk_live'));
