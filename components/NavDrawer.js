'use client';

import Link from 'next/link';
import { IconHome, IconX } from '@tabler/icons-react';
import { CATEGORY_ICONS } from './CategoryRow';
import Toast from '@/components/ui/Toast';
import { CATEGORIES } from '@/lib/categories';
import { useCheckout } from '@/components/useCheckout';
import { useOverlayDismiss } from './useOverlayDismiss';
import styles from './NavDrawer.module.css';

/**
 * Slide-out navigation from the left, opened by the top bar's hamburger.
 *
 * The backdrop sits above the sticky top bar, so a click on the hamburger while
 * the drawer is open lands on the backdrop and closes it — the toggle cannot
 * fire twice and re-open in the same gesture. Escape and body scroll locking
 * come from useOverlayDismiss.
 *
 * Categories link to /?category=<id> rather than calling into DirectoryBrowser,
 * so they work from any page that renders the top bar; DirectoryBrowser follows
 * the query string.
 */
export default function NavDrawer({ open, onClose }) {
  const { startCheckout, loading, error, toast } = useCheckout();

  useOverlayDismiss(open, onClose);

  function listYourBusiness() {
    onClose();
    startCheckout();
  }

  return (
    <>
      {/* Kept mounted so the panel can transition; `open` drives visibility. */}
      <div
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ''}`}
        onMouseDown={onClose}
        aria-hidden="true"
      />

      <nav
        className={`${styles.panel} ${open ? styles.panelOpen : ''}`}
        aria-label="Main menu"
        aria-hidden={!open}
      >
        <div className={styles.head}>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close menu"
            tabIndex={open ? 0 : -1}
          >
            <IconX size={20} stroke={1.75} />
          </button>
          <span className={styles.brand}>localreg</span>
        </div>

        <div className={styles.body}>
          <Link className={styles.row} href="/" onClick={onClose} tabIndex={open ? 0 : -1}>
            <span className={styles.rowIcon} style={{ background: 'var(--field)', color: 'var(--ink)' }}>
              <IconHome size={18} stroke={1.75} />
            </span>
            Home
          </Link>

          {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.icon];

            return (
              <Link
                key={cat.id}
                className={styles.row}
                href={`/?category=${cat.id}`}
                onClick={onClose}
                tabIndex={open ? 0 : -1}
              >
                <span
                  className={styles.rowIcon}
                  style={{ background: cat.tint, color: cat.ink }}
                >
                  <Icon size={18} stroke={1.75} />
                </span>
                {cat.label}
              </Link>
            );
          })}

          <hr className={styles.divider} />

          <button
            type="button"
            className={styles.textRow}
            onClick={listYourBusiness}
            disabled={loading}
            tabIndex={open ? 0 : -1}
          >
            {loading ? 'Starting…' : 'List your business'}
          </button>

          {/* One entry, not two: "Manage listing" and "Request a change" were
              the same job, so this is the active link to that form. */}
          <Link className={styles.textRow} href="/request-change" onClick={onClose} tabIndex={open ? 0 : -1}>
            Manage listing
          </Link>
          <Link className={styles.textRow} href="/terms" onClick={onClose} tabIndex={open ? 0 : -1}>
            Terms
          </Link>
          <Link className={styles.textRow} href="/privacy" onClick={onClose} tabIndex={open ? 0 : -1}>
            Privacy
          </Link>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
      </nav>

      <Toast toast={toast} />
    </>
  );
}
