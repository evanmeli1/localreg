'use client';

import { useState } from 'react';
import styles from './PhotoGallery.module.css';

/**
 * Banner image plus a thumbnail strip when a listing has more than one photo.
 * Clicking a thumbnail swaps the large image — no lightbox or carousel
 * library, since that is all the interaction this needs.
 */
export default function PhotoGallery({ photos, name, children }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = photos[activeIndex] ?? photos[0];

  return (
    <>
      <div
        className={styles.banner}
        style={{
          backgroundImage: `url(${active})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {children}
      </div>

      {photos.length > 1 && (
        <ul className={styles.strip}>
          {photos.map((url, i) => (
            <li key={url}>
              <button
                type="button"
                className={`${styles.thumb} ${i === activeIndex ? styles.active : ''}`}
                onClick={() => setActiveIndex(i)}
                aria-label={`Show photo ${i + 1} of ${photos.length}`}
                aria-current={i === activeIndex}
              >
                {/* Remote Supabase Storage URL; next/image would need host config. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`${name} photo ${i + 1}`} className={styles.thumbImg} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
