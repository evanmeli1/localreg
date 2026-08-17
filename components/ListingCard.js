'use client';

import Link from 'next/link';
import { IconCheck } from '@tabler/icons-react';
import { getCategory } from '@/lib/categories';
import { gradientFor } from '@/lib/gradients';
import styles from './ListingCard.module.css';

export default function ListingCard({ listing, index = 0 }) {
  const category = getCategory(listing.categoryId);

  return (
    <Link href={`/listing/${listing.id}`} className={styles.card}>
      <div className={styles.cover} style={{ background: gradientFor(index) }}>
        {listing.status === 'live' && (
          <span className={styles.badge}>
            <IconCheck size={11} stroke={3} />
            VERIFIED
          </span>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.name}>{listing.name}</div>
        <div className={styles.meta}>
          {category ? category.label : 'Other'} · {listing.subcategory}
        </div>
      </div>
    </Link>
  );
}
