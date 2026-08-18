'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './Toast.module.css';

export const TOO_FAST_MESSAGE = "You're doing that too fast. Please wait a moment and try again.";

/**
 * The single toast implementation, shared by the admin queue's approve/reject
 * confirmations and the public forms' rate-limit warnings.
 *
 * tone: 'green' (success) | 'red' (error / rate limited)
 */
export default function Toast({ toast }) {
  if (!toast) return null;

  return (
    <div
      className={`${styles.toast} ${toast.tone === 'red' ? styles.red : styles.green}`}
      role="status"
    >
      {toast.message}
    </div>
  );
}

/**
 * Owns toast state and its auto-dismiss timer.
 * @returns {{toast: object|null, showToast: Function, showTooFast: Function}}
 */
export function useToast(autoDismissMs = 3000) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const showToast = useCallback(
    (message, tone = 'green') => {
      clearTimeout(timer.current);
      setToast({ message, tone });
      timer.current = setTimeout(() => setToast(null), autoDismissMs);
    },
    [autoDismissMs],
  );

  /** The shared "slow down" warning, used for 429s and rapid repeat clicks. */
  const showTooFast = useCallback(() => showToast(TOO_FAST_MESSAGE, 'red'), [showToast]);

  return { toast, showToast, showTooFast };
}

/**
 * Detects rapid repeat clicking (more than `limit` presses inside `windowMs`).
 * Complements server-side rate limiting: this catches an impatient user before
 * a request is even sent.
 */
export function useRapidClickGuard(limit = 4, windowMs = 2000) {
  const clicks = useRef([]);

  return useCallback(() => {
    const now = Date.now();
    clicks.current = clicks.current.filter((t) => now - t < windowMs);
    clicks.current.push(now);
    return clicks.current.length > limit;
  }, [limit, windowMs]);
}
