'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { getCategory } from '@/lib/categories';
import { formatSubmittedDate } from '@/lib/format';
import styles from './ApprovalQueue.module.css';

export default function ApprovalQueue({ password }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    return () => clearTimeout(toastTimer.current);
  }, []);

  const showToast = useCallback((message, tone) => {
    clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const res = await fetch('/api/admin/listings', {
        headers: { 'x-admin-password': password },
        cache: 'no-store',
      });
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
  }, [password]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(submission, decision) {
    if (busyId) return;
    setBusyId(submission.id);

    try {
      const res = await fetch(`/api/admin/${decision}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ id: submission.id }),
      });
      const body = await res.json().catch(() => ({}));

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

  return (
    <main className={styles.shell}>
      <div className={styles.head}>
        <h1 className={styles.heading}>Pending approvals</h1>
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
        <p className={styles.empty}>Queue is clear — nothing waiting on review.</p>
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

      {toast && (
        <div
          className={`${styles.toast} ${toast.tone === 'red' ? styles.toastRed : styles.toastGreen}`}
          role="status"
        >
          {toast.message}
        </div>
      )}
    </main>
  );
}
