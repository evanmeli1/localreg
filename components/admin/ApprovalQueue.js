'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { getCategory } from '@/lib/categories';
import { formatSubmittedDate } from '@/lib/format';
import Toast, { useToast } from '@/components/ui/Toast';
import styles from './ApprovalQueue.module.css';

// Authentication is the HttpOnly session cookie, which the browser attaches to
// these same-origin requests automatically. Nothing about the session is held
// in component state.
export default function ApprovalQueue() {
  const router = useRouter();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  // Shared toast implementation — see components/ui/Toast.js.
  const { toast, showToast, showTooFast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const res = await fetch('/api/admin/listings', { cache: 'no-store' });

      // Session expired or cleared mid-visit: re-render the server component,
      // which drops back to the login form rather than showing a broken queue.
      if (res.status === 401) {
        router.refresh();
        return;
      }

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setLoadError(body.error || 'Could not load the queue.');
      } else {
        setPending(body.listings ?? []);
      }
    } catch (err) {
      console.error('[admin] queue fetch failed', err);
      setLoadError('Could not reach the server.');
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(submission, decision) {
    if (busyId) return;
    setBusyId(submission.id);

    try {
      const res = await fetch(`/api/admin/${decision}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: submission.id }),
      });

      if (res.status === 401) {
        router.refresh();
        return;
      }

      const body = await res.json().catch(() => ({}));

      if (res.status === 429) {
        showTooFast();
        setBusyId(null);
        return;
      }

      if (!res.ok) {
        showToast(body.error || `Could not ${decision} ${submission.name}`, 'red');
        // A 409 means someone else already handled it — resync rather than
        // leaving a row on screen that no longer exists in the queue.
        if (res.status === 409) load();
        setBusyId(null);
        return;
      }

      setPending((prev) => prev.filter((s) => s.id !== submission.id));
      showToast(
        `${decision === 'approve' ? 'Approved' : 'Rejected'} ${submission.name}`,
        decision === 'approve' ? 'green' : 'red',
      );
    } catch (err) {
      console.error(`[admin] ${decision} failed`, err);
      showToast('Could not reach the server. Please try again.', 'red');
    }

    setBusyId(null);
  }

  // The page shell, heading and log-out live in AdminDashboard now, so this
  // renders only the queue itself.
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.heading}>Pending approvals</h2>
        {!loading && !loadError && <Badge variant="count">{pending.length}</Badge>}
      </div>

      {loading ? (
        <p className={styles.empty}>Loading the queue…</p>
      ) : loadError ? (
        <div className={styles.errorBox}>
          <p className={styles.errorTitle}>Couldn&apos;t load the queue</p>
          <p className={styles.errorText}>{loadError}</p>
          <Button variant="quiet" onClick={load}>
            Try again
          </Button>
        </div>
      ) : pending.length === 0 ? (
        <p className={styles.empty}>Queue is clear. Nothing waiting on review.</p>
      ) : (
        <div className={styles.list}>
          {pending.map((submission) => {
            const category = getCategory(submission.category);
            const busy = busyId === submission.id;

            return (
              <article key={submission.id} className={styles.row}>
                <div className={styles.main}>
                  <div className={styles.topLine}>
                    <span className={styles.name}>{submission.name}</span>
                    <span className={styles.meta}>
                      {category ? category.label : 'Other'} ·{' '}
                      {submission.subcategory}
                    </span>
                    <span className={styles.date}>
                      Submitted {formatSubmittedDate(submission.created_at)}
                    </span>
                  </div>
                  <p className={styles.description}>{submission.description}</p>
                </div>

                <div className={styles.actions}>
                  <Button
                    variant="outlineGreen"
                    disabled={busy}
                    onClick={() => decide(submission, 'approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outlineRed"
                    disabled={busy}
                    onClick={() => decide(submission, 'reject')}
                  >
                    Reject
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Toast toast={toast} />
    </section>
  );
}
