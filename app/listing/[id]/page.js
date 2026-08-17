import Link from 'next/link';
import { notFound } from 'next/navigation';
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
import { getCategory } from '@/lib/categories';
import { LISTINGS, formatListedSince, getListing } from '@/lib/listings';
import { gradientFor } from '@/lib/gradients';
import styles from './page.module.css';

export function generateStaticParams() {
  return LISTINGS.map((l) => ({ id: l.id }));
}

export default async function ListingPage({ params }) {
  const { id } = await params;
  const listing = getListing(id);
  if (!listing) notFound();

  const category = getCategory(listing.categoryId);
  // Same rotation the homepage grid uses, so a card and its detail banner match.
  const index = LISTINGS.findIndex((l) => l.id === listing.id);
  const websiteHref = `https://${listing.website}`;

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

        <div className={styles.banner} style={{ background: gradientFor(index) }}>
          {listing.status === 'live' && (
            <Badge className={styles.bannerBadge}>
              <IconCheck size={12} stroke={3} />
              VERIFIED LISTING
            </Badge>
          )}
        </div>

        <h1 className={styles.name}>{listing.name}</h1>
        <p className={styles.meta}>
          {category ? category.label : 'Other'} · {listing.subcategory} ·{' '}
          {listing.city}
        </p>

        <Card title="About" className={styles.card}>
          <p className={styles.about}>{listing.blurb}</p>
        </Card>

        <Card title="Details" className={styles.card}>
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

          <div className={styles.row}>
            <IconCalendar size={16} stroke={1.75} className={styles.rowIcon} />
            <span className={styles.rowText}>
              Listed since {formatListedSince(listing.listedSince)}
            </span>
          </div>
        </Card>

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
      </main>
    </>
  );
}
