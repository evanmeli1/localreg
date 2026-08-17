import Link from 'next/link';
import {
  IconArrowLeft,
  IconCalendar,
  IconCheck,
  IconWorld,
} from '@tabler/icons-react';
import TopBar from '@/components/TopBar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import PhotoGallery from '@/components/PhotoGallery';
import { getCategory } from '@/lib/categories';
import { fetchLiveListingById } from '@/lib/businesses';
import { formatListedSince } from '@/lib/format';
import { gradientFor } from '@/lib/gradients';
import styles from './page.module.css';

// Listings change whenever an admin approves one, so this page is rendered per
// request rather than baked at build time (which is also why the old
// generateStaticParams over the mock array is gone).
export const dynamic = 'force-dynamic';

export default async function ListingPage({ params }) {
  const { id } = await params;
  const { listing, error } = await fetchLiveListingById(id);

  if (!listing) {
    return <NotFoundState error={error} />;
  }

  const category = getCategory(listing.categoryId);
  // Gradient rotation needs a stable per-listing index; derive one from the
  // uuid so a given listing always gets the same colour.
  const index = hashIndex(listing.id);
  const websiteHref = listing.website ? toHref(listing.website) : null;

  return (
    <>
      <TopBar />

      <main className={styles.shell}>
        <Link
          href={category ? `/?category=${category.id}` : '/'}
          className={styles.back}
        >
          <IconArrowLeft size={15} stroke={1.75} />
          Back to {category ? category.label : 'directory'}
        </Link>

        {listing.photoUrls.length > 0 ? (
          <PhotoGallery photos={listing.photoUrls} name={listing.name}>
            <Badge className={styles.bannerBadge}>
              <IconCheck size={12} stroke={3} />
              VERIFIED LISTING
            </Badge>
          </PhotoGallery>
        ) : (
          <div className={styles.banner} style={{ background: gradientFor(index) }}>
            <Badge className={styles.bannerBadge}>
              <IconCheck size={12} stroke={3} />
              VERIFIED LISTING
            </Badge>
          </div>
        )}

        <h1 className={styles.name}>{listing.name}</h1>
        <p className={styles.meta}>
          {category ? category.label : 'Other'} · {listing.subcategory}
        </p>

        <Card title="About" className={styles.card}>
          <p className={styles.about}>{listing.blurb}</p>
        </Card>

        <Card title="Details" className={styles.card}>
          {websiteHref && (
            <div className={styles.row}>
              <IconWorld size={16} stroke={1.75} className={styles.rowIcon} />
              <a
                href={websiteHref}
                className={styles.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {listing.website}
              </a>
            </div>
          )}

          <div className={styles.row}>
            <IconCalendar size={16} stroke={1.75} className={styles.rowIcon} />
            <span className={styles.rowText}>
              Listed since {formatListedSince(listing.listedSince)}
            </span>
          </div>
        </Card>

        {websiteHref && (
          <Button
            href={websiteHref}
            size="lg"
            fullWidth
            className={styles.cta}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit website
          </Button>
        )}
      </main>
    </>
  );
}

/** Shown for a bad id, a pending/rejected listing, or a failed query. */
function NotFoundState({ error }) {
  return (
    <>
      <TopBar />
      <main className={styles.shell}>
        <Link href="/" className={styles.back}>
          <IconArrowLeft size={15} stroke={1.75} />
          Back to directory
        </Link>

        <div className={styles.missing}>
          <p className={styles.missingTitle}>
            {error ? 'Couldn’t load this listing' : 'Listing not found'}
          </p>
          <p className={styles.missingText}>
            {error
              ? error
              : 'This listing either doesn’t exist or isn’t live yet. It may still be waiting on review.'}
          </p>
          <Link href="/" className={styles.missingCta}>
            Browse the directory →
          </Link>
        </div>
      </main>
    </>
  );
}

/** Stable small integer from a uuid, for gradient rotation. */
function hashIndex(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Accepts 'example.com' or a full URL and always returns something linkable. */
function toHref(website) {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}
