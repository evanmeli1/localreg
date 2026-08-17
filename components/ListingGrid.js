'use client';

import ListingCard from './ListingCard';
import styles from './ListingGrid.module.css';

export default function ListingGrid({ heading, listings }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>
        {heading} · {listings.length}{' '}
        {listings.length === 1 ? 'listing' : 'listings'}
      </h2>

      {listings.length === 0 ? (
        <p className={styles.empty}>
          No listings here yet. Try another category or clear your search.
        </p>
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
