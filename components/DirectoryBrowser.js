'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CategoryRow from './CategoryRow';
import ListingGrid from './ListingGrid';
import PromoBanner from './PromoBanner';
import SubcategoryChips, { ALL } from './SubcategoryChips';
import TopBar from './TopBar';
import { getCategory } from '@/lib/categories';
import { fetchLiveListings } from '@/lib/businesses';
import styles from './DirectoryBrowser.module.css';

export default function DirectoryBrowser() {
  // ?category=auto preselects a category — that's how the listing detail page's
  // "← Back to Auto" link returns you to where you were.
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const initialCategory = getCategory(categoryParam)?.id ?? null;

  const [categoryId, setCategoryId] = useState(initialCategory);
  const [subcategory, setSubcategory] = useState(ALL);
  const [query, setQuery] = useState('');

  // The nav drawer links to /?category=<id> from a page that is already
  // mounted, so the initial useState value above is not enough — without this
  // the URL would change and the grid would not. Keyed on the param alone, so
  // picking a category from CategoryRow (which leaves the URL untouched) does
  // not get clobbered.
  useEffect(() => {
    setCategoryId(getCategory(categoryParam)?.id ?? null);
    setSubcategory(ALL);
  }, [categoryParam]);

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchLiveListings().then(({ listings: rows, error }) => {
      if (cancelled) return;
      setListings(rows);
      setLoadError(error);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const category = getCategory(categoryId);

  // "Other" holds free-text subcategories, so its chips come from the live
  // listings themselves rather than a fixed list. Empty until one exists.
  const otherSubcategories = useMemo(() => {
    const seen = new Set(
      listings.filter((l) => l.categoryId === 'other').map((l) => l.subcategory),
    );
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [listings]);

  function handleSelectCategory(nextId) {
    setCategoryId(nextId);
    // Every category change drops back to its "All ..." chip.
    setSubcategory(ALL);
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    return listings.filter((listing) => {
      if (categoryId && listing.categoryId !== categoryId) return false;
      if (subcategory !== ALL && listing.subcategory !== subcategory) {
        return false;
      }
      if (!q) return true;

      const cat = getCategory(listing.categoryId);
      const haystack = [listing.name, listing.subcategory, cat ? cat.label : '']
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [listings, categoryId, subcategory, query]);

  const heading = query.trim()
    ? `Results for "${query.trim()}"`
    : category
      ? subcategory === ALL
        ? category.label
        : `${category.label} · ${subcategory}`
      : 'All listings';

  return (
    <>
      <TopBar query={query} onQueryChange={setQuery} />

      {/* Outside the shell so it can run edge to edge, flush under the bar. */}
      <PromoBanner />

      <main className={styles.shell}>
        <CategoryRow selectedId={categoryId} onSelect={handleSelectCategory} />

        {category && (
          <div className={styles.chips}>
            <SubcategoryChips
              category={category}
              selected={subcategory}
              onSelect={setSubcategory}
              subcategories={category.id === 'other' ? otherSubcategories : undefined}
            />
          </div>
        )}

        <ListingGrid
          heading={heading}
          listings={visible}
          loading={loading}
          error={loadError}
          // Distinguishes "nothing matches your filter" from "the directory is
          // empty" — right after launch every visitor hits the latter.
          directoryEmpty={listings.length === 0}
        />
      </main>
    </>
  );
}
