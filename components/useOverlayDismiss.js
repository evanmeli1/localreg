'use client';

import { useEffect, useRef } from 'react';

/**
 * Shared behaviour for anything that covers the page — the nav drawer and the
 * modal both use it: Escape closes, and the body stops scrolling underneath
 * while it is open.
 *
 * `onClose` is held in a ref so a caller passing an inline arrow function does
 * not re-run the effect on every render (which would re-lock the body scroll
 * and churn the listener).
 */
export function useOverlayDismiss(open, onClose) {
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === 'Escape') close.current();
    }

    document.addEventListener('keydown', onKeyDown);

    // Restore whatever was there rather than assuming '' — two overlays could
    // in principle overlap.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
}
