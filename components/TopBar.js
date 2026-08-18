'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IconMenu2, IconSearch } from '@tabler/icons-react';
import ListYourBusinessButton from './ListYourBusinessButton';
import NavDrawer from './NavDrawer';
import styles from './TopBar.module.css';

/**
 * Sticky top bar. `query`/`onQueryChange` are optional — pages that don't own
 * search state (e.g. the listing detail page) render the input uncontrolled.
 */
export default function TopBar({ query, onQueryChange }) {
  const controlled = typeof onQueryChange === 'function';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Outside <header>: the bar is sticky with a z-index, which would trap
          the drawer inside its stacking context. */}
      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <header className={styles.bar}>
        <div className={styles.inner}>
          <button
            className={styles.menu}
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
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
            {/* "Manage listing" lives in the footer now — see components/Footer.js.
                Opens Stripe Checkout; /welcome is reached only after payment. */}
            <ListYourBusinessButton />
          </nav>
        </div>
      </header>
    </>
  );
}
