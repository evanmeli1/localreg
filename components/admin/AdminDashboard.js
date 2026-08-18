'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import ApprovalQueue from './ApprovalQueue';
import ChangeRequests from './ChangeRequests';
import ListingsManager from './ListingsManager';
import styles from './AdminDashboard.module.css';

/**
 * The signed-in admin view: one shell, three panels.
 *
 * Tabs rather than separate routes, because all three are the same protected
 * area behind the same session and switching between them should not cost a
 * page load. The server-side gate in app/admin/page.js is what actually
 * protects this — none of these components reach the browser without it.
 */

const TABS = [
  { id: 'queue', label: 'Pending approvals' },
  { id: 'changes', label: 'Change requests' },
  { id: 'listings', label: 'Live listings' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState('queue');
  const [loggingOut, setLoggingOut] = useState(false);
  // Bumped after an edit so the change-request panel re-reads business names.
  const [dataVersion, setDataVersion] = useState(0);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      console.error('[admin] logout failed', err);
    }
    // Refresh either way: if the cookie did clear, the server component now
    // renders the login form.
    router.refresh();
    setLoggingOut(false);
  }

  return (
    <main className={styles.shell}>
      <div className={styles.head}>
        <h1 className={styles.heading}>Admin</h1>
        <div className={styles.headActions}>
          <Button variant="quiet" onClick={logout} disabled={loggingOut}>
            {loggingOut ? 'Logging out…' : 'Log out'}
          </Button>
        </div>
      </div>

      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Kept unmounted rather than hidden: each panel fetches on mount, and
          switching tabs should get fresh data rather than a stale list. */}
      {tab === 'queue' && <ApprovalQueue />}
      {tab === 'changes' && <ChangeRequests key={dataVersion} />}
      {tab === 'listings' && (
        <ListingsManager onSaved={() => setDataVersion((v) => v + 1)} />
      )}
    </main>
  );
}
