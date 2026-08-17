'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { IconChevronDown, IconRoute } from '@tabler/icons-react';
import styles from './DevNav.module.css';

// TEMPORARY dev-only route menu. Nothing links to /welcome, /admin, or
// /request-change yet — Stripe and Supabase provide those entry points later.
// Delete this component (and its mount in app/layout.js) before launch.
// Listing detail is reached by clicking a card — ids are database uuids now,
// so there's no static URL to link here.
const ROUTES = [
  { href: '/', label: 'Directory' },
  // Reachable only with a real paid Stripe session now; this shows the gate.
  { href: '/welcome', label: 'Welcome / intake (gated)' },
  { href: '/admin', label: 'Admin queue' },
  { href: '/request-change', label: 'Change request' },
];

export default function DevNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className={styles.wrap}>
      {open && (
        <nav className={styles.panel}>
          <div className={styles.panelHead}>Dev routes</div>
          {ROUTES.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={`${styles.link} ${pathname === route.href ? styles.active : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className={styles.linkLabel}>{route.label}</span>
              <span className={styles.linkPath}>{route.href}</span>
            </Link>
          ))}
        </nav>
      )}

      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? (
          <IconChevronDown size={15} stroke={2} />
        ) : (
          <IconRoute size={15} stroke={2} />
        )}
        Dev nav
      </button>
    </div>
  );
}
