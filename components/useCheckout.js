'use client';

import { useState } from 'react';
import { useToast, useRapidClickGuard } from '@/components/ui/Toast';

/**
 * The single entry point into Stripe Checkout, shared by every "List your
 * business" CTA on the site (the top bar button and the promo banner).
 *
 * It lives in a hook rather than in one component so a second CTA cannot drift
 * away from the first: the rate-limit handling, the rapid-click guard and the
 * hand-off to Stripe are defined once here, and each caller supplies only its
 * own markup.
 *
 * Creating the session needs the secret key, so the browser asks the server for
 * a hosted URL and then leaves for Stripe — card details never touch this app.
 *
 * @returns {{startCheckout: Function, loading: boolean, error: string|null, toast: object|null}}
 */
export function useCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast, showTooFast } = useToast();
  const isRapidClicking = useRapidClickGuard();

  async function startCheckout() {
    // Disabled-on-click already prevents the common double-click; this also
    // catches someone hammering the button between responses.
    if (loading) return;
    if (isRapidClicking()) {
      showTooFast();
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/checkout', { method: 'POST' });

      if (res.status === 429) {
        showTooFast();
        setLoading(false);
        return;
      }

      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body.url) {
        setError(body.error || 'Could not start checkout. Please try again.');
        setLoading(false);
        return;
      }

      // Full navigation rather than the Next router: this leaves the app for
      // Stripe's hosted page, which the client-side router cannot handle.
      window.location.href = body.url;
      // Deliberately leave `loading` true — the page is on its way out, and
      // clearing it would flash the button back to its idle label first.
    } catch (err) {
      console.error('[checkout] request failed', err);
      setError('Could not reach the server. Please try again.');
      setLoading(false);
    }
  }

  return { startCheckout, loading, error, toast };
}
