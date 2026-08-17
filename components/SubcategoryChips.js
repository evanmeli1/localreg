'use client';

import styles from './SubcategoryChips.module.css';

export const ALL = '__all__';

/**
 * `subcategories` overrides the taxonomy list — used by "Other", whose values
 * are free text and so are derived from live listings rather than fixed.
 */
export default function SubcategoryChips({ category, selected, onSelect, subcategories }) {
  if (!category) return null;

  const options = subcategories ?? category.subcategories;
  const chips = [
    { value: ALL, label: `All ${category.label}` },
    ...options.map((s) => ({ value: s, label: s })),
  ];

  return (
    <div className={`${styles.row} scroll-x`}>
      {chips.map((chip) => {
        const isSelected = chip.value === selected;
        return (
          <button
            key={chip.value}
            type="button"
            className={`${styles.chip} ${isSelected ? styles.selected : ''}`}
            aria-pressed={isSelected}
            onClick={() => onSelect(chip.value)}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
