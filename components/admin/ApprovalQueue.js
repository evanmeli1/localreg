'use client';

import { useEffect, useRef, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { getCategory } from '@/lib/categories';
import { PENDING_SUBMISSIONS, formatSubmittedDate } from '@/lib/pending';
import styles from './ApprovalQueue.module.css';

export default function ApprovalQueue() {
  const [pending, setPending] = useState(PENDING_SUBMISSIONS);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    return () => clearTimeout(toastTimer.current);
  }, []);

  function showToast(message, tone) {
    clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  // Client-side only for now: approve/reject just drops the row from the list.
  function decide(submission, decision) {
    setPending((prev) => prev.filter((s) => s.id !== submission.id));
    showToast(
      `${decision === 'approve' ? 'Approved' : 'Rejected'} ${submission.name}`,
      decision === 'approve' ? 'green' : 'red',
    );
  }

  return (
    <main className={styles.shell}>
      <div className={styles.head}>
        <h1 className={styles.heading}>Pending approvals</h1>
        <Badge variant="count">{pending.length}</Badge>
      </div>

      {pending.length === 0 ? (
        <p className={styles.empty}>Queue is clear — nothing waiting on review.</p>
      ) : (
        <div className={styles.list}>
          {pending.map((submission) => {
            const category = getCategory(submission.categoryId);

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
                      Submitted {formatSubmittedDate(submission.submittedAt)}
                    </span>
                  </div>
                  <p className={styles.description}>{submission.description}</p>
                </div>

                <div className={styles.actions}>
                  <Button
                    variant="outlineGreen"
                    onClick={() => decide(submission, 'approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outlineRed"
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
