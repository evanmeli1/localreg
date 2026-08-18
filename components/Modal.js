'use client';

import { IconX } from '@tabler/icons-react';
import { useOverlayDismiss } from './useOverlayDismiss';
import styles from './Modal.module.css';

/**
 * Generic centred modal: dark backdrop, click-outside to close, Escape to
 * close, circular close button in the top-left corner.
 *
 * Callers supply the body; see TermsModal for the section markup.
 */
export default function Modal({ open, onClose, labelledBy, children }) {
  useOverlayDismiss(open, onClose);

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      // mousedown rather than click: a click that starts inside the card and
      // ends on the backdrop (selecting text, say) should not close it.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.card} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close"
        >
          <IconX size={18} stroke={2.2} />
        </button>

        {children}
      </div>
    </div>
  );
}
