'use client';

import { useState } from 'react';
import styles from './ListYourBusinessButton.module.css';

/**
 * Starts Stripe Checkout. Creating the session needs the secret key, so the
 * browser asks the server for a hosted URL and then hands the visitor off to
 * Stripe — card details never touch this app.
 */
export default function ListYourBusinessButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function startCheckout() {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
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

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.cta}
        onClick={startCheckout}
        disabled={loading}
      >
        {loading ? 'Starting…' : 'List your business'}
      </button>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
