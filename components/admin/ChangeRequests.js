'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Toast, { useToast } from '@/components/ui/Toast';
import { getCategory } from '@/lib/categories';
import { formatSubmittedDate } from '@/lib/format';
import styles from './ChangeRequests.module.css';

/**
 * Every change request an owner has filed, newest first.
 *
 * Marking one resolved is bookkeeping only: it records that it has been dealt
 * with. Actually changing the listing happens on the Live listings tab, and
 * nothing here emails the owner (no sending provider is wired up yet).
 */
export default function ChangeRequests() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [showResolved, setShowResolved] = useState(false);
  const { toast, showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/change-requests', { cache: 'no-store' });
      if (res.status === 401) {
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setLoadError(body.error || 'Could not load change requests.');
      else setRequests(body.requests ?? []);
    } catch (err) {
      console.error('[admin] change requests fetch failed', err);
      setLoadError('Could not reach the server.');
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function setResolved(req, resolved) {
    if (busyId) return;
    setBusyId(req.id);
    try {
      const res = await fetch('/api/admin/change-requests/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: req.id, resolved }),
      });

      if (res.status === 401) {
        router.refresh();
        return;
      }

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body.error || 'Could not update that request.', 'red');
        setBusyId(null);
        return;
      }

      setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, resolved } : r)));
      showToast(resolved ? 'Marked resolved' : 'Reopened', resolved ? 'green' : 'red');
    } catch (err) {
      console.error('[admin] resolve failed', err);
      showToast('Could not reach the server. Please try again.', 'red');
    }
    setBusyId(null);
  }

  const open = requests.filter((r) => !r.resolved);
  const visible = showResolved ? requests : open;

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.heading}>Change requests</h2>
        {!loading && !loadError && <Badge variant="count">{open.length}</Badge>}
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
          />
          Show resolved
        </label>
      </div>

      {loading ? (
        <p className={styles.empty}>Loading change requests…</p>
      ) : loadError ? (
        <div className={styles.errorBox}>
          <p className={styles.errorTitle}>Couldn&apos;t load change requests</p>
          <p className={styles.errorText}>{loadError}</p>
          <Button variant="quiet" onClick={load}>
            Try again
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <p className={styles.empty}>
          {requests.length === 0
            ? 'No change requests yet.'
            : 'Nothing outstanding. Tick “Show resolved” to see handled ones.'}
        </p>
      ) : (
        <div className={styles.list}>
          {visible.map((req) => {
            const business = req.businesses;
            const category = business ? getCategory(business.category) : null;
            const busy = busyId === req.id;
            const photos = req.photo_urls ?? [];

            return (
              <article key={req.id} className={`${styles.row} ${req.resolved ? styles.rowResolved : ''}`}>
                <div className={styles.rowHead}>
                  <span className={styles.business}>
                    {/* business_id is ON DELETE SET NULL, so a request can
                        outlive its listing. Say so rather than showing blank. */}
                    {business ? business.name : 'Listing no longer exists'}
                  </span>
                  {business && (
                    <span className={styles.meta}>
                      {category ? category.label : business.category} · {business.subcategory}
                      {business.reference_id ? ` · ${business.reference_id}` : ''}
                    </span>
                  )}
                  <Badge variant={req.resolved ? 'greenSoft' : 'neutral'}>
                    {req.resolved ? 'Resolved' : 'Open'}
                  </Badge>
                  <span className={styles.date}>{formatSubmittedDate(req.created_at)}</span>
                </div>

                <p className={styles.details}>{req.request_details}</p>

                <p className={styles.submitted}>
                  Submitted as <span className={styles.identifier}>{req.identifier}</span>
                </p>

                {photos.length > 0 && (
                  <div className={styles.photos}>
                    {photos.map((url, i) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className={styles.photoLink}>
                        {/* Plain <img>: these are admin-only thumbnails of
                            arbitrary Storage URLs, not part of the public page. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Attachment ${i + 1}`} className={styles.photo} />
                      </a>
                    ))}
                  </div>
                )}

                <div className={styles.actions}>
                  {req.resolved ? (
                    <Button variant="quiet" disabled={busy} onClick={() => setResolved(req, false)}>
                      Reopen
                    </Button>
                  ) : (
                    <Button variant="outlineGreen" disabled={busy} onClick={() => setResolved(req, true)}>
                      Mark resolved
                    </Button>
                  )}
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
