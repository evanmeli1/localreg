'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CategoryRow from './CategoryRow';
import ListingGrid from './ListingGrid';
import SubcategoryChips, { ALL } from './SubcategoryChips';
import TopBar from './TopBar';
import { getCategory } from '@/lib/categories';
import { LISTINGS } from '@/lib/listings';
import styles from './DirectoryBrowser.module.css';

export default function DirectoryBrowser() {
  // ?category=auto preselects a category — that's how the listing detail page's
  // "← Back to Auto" link returns you to where you were.
  const searchParams = useSearchParams();
  const initialCategory = getCategory(searchParams.get('category'))?.id ?? null;

  const [categoryId, setCategoryId] = useState(initialCategory);
  const [subcategory, setSubcategory] = useState(ALL);
  const [query, setQuery] = useState('');

  const category = getCategory(categoryId);

  function handleSelectCategory(nextId) {
    setCategoryId(nextId);
    // Every category change drops back to its "All ..." chip.
    setSubcategory(ALL);
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    return LISTINGS.filter((listing) => {
      if (categoryId && listing.categoryId !== categoryId) return false;
      if (subcategory !== ALL && listing.subcategory !== subcategory) {
        return false;
      }
      if (!q) return true;

      const cat = getCategory(listing.categoryId);
      const haystack = [
        listing.name,
        listing.subcategory,
        listing.city,
        cat ? cat.label : '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [categoryId, subcategory, query]);

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

      <main className={styles.shell}>
        <CategoryRow selectedId={categoryId} onSelect={handleSelectCategory} />

        {category && (
          <div className={styles.chips}>
            <SubcategoryChips
              category={category}
              selected={subcategory}
              onSelect={setSubcategory}
            />
          </div>
        )}

        <ListingGrid heading={heading} listings={visible} />
      </main>
    </>
  );
}
