'use client';

import Link from 'next/link';
import { IconMenu2, IconSearch } from '@tabler/icons-react';
import styles from './TopBar.module.css';

/**
 * Sticky top bar. `query`/`onQueryChange` are optional — pages that don't own
 * search state (e.g. the listing detail page) render the input uncontrolled.
 */
export default function TopBar({ query, onQueryChange }) {
  const controlled = typeof onQueryChange === 'function';

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <button className={styles.menu} type="button" aria-label="Open menu">
          <IconMenu2 size={20} stroke={1.75} />
        </button>

        <Link href="/" className={styles.logo}>
          localreg
        </Link>

        <div className={styles.search}>
          <IconSearch size={16} stroke={1.75} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search businesses or categories"
            aria-label="Search businesses or categories"
            {...(controlled
              ? { value: query, onChange: (e) => onQueryChange(e.target.value) }
              : {})}
          />
        </div>

        <nav className={styles.actions}>
          {/* TODO: replace with the Stripe Customer Portal URL once billing is
              wired up — it's a generated session link, so there's nothing to
              point at yet. Disabled rather than routed to a stub page. */}
          <span
            className={styles.textLinkDisabled}
            aria-disabled="true"
            data-tooltip="Coming soon"
          >
            {/* Only the label is faded — the tooltip would inherit the opacity
                if it hung off the same element. */}
            <span className={styles.disabledLabel}>Manage listing</span>
          </span>

          {/* TODO: temporary. This should open Stripe Checkout and only land on
              /welcome after payment succeeds. */}
          <Link href="/welcome" className={styles.cta}>
            List your business
          </Link>
        </nav>
      </div>
    </header>
  );
}
