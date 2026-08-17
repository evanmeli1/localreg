'use client';

import Link from 'next/link';
import ListingCard from './ListingCard';
import styles from './ListingGrid.module.css';

const SKELETON_COUNT = 8;

export default function ListingGrid({
  heading,
  listings,
  loading = false,
  error = null,
  directoryEmpty = false,
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>
        {loading
          ? heading
          : `${heading} · ${listings.length} ${listings.length === 1 ? 'listing' : 'listings'}`}
      </h2>

      {loading ? (
        <div className={styles.grid} aria-busy="true" aria-label="Loading listings">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <div key={i} className={styles.skeleton}>
              <div className={styles.skeletonCover} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={styles.state}>
          <p className={styles.stateTitle}>Couldn&apos;t load listings</p>
          <p className={styles.stateText}>{error}</p>
        </div>
      ) : listings.length === 0 ? (
        <div className={styles.state}>
          {directoryEmpty ? (
            <>
              <p className={styles.stateTitle}>No listings yet</p>
              <p className={styles.stateText}>
                This directory is brand new. Approved listings show up here as
                soon as they go live.
              </p>
              <Link href="/welcome" className={styles.stateCta}>
                List your business →
              </Link>
            </>
          ) : (
            <>
              <p className={styles.stateTitle}>No listings yet in this category</p>
              <p className={styles.stateText}>
                Try another category or clear your search.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {listings.map((listing, i) => (
            <ListingCard key={listing.id} listing={listing} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
