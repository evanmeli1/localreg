'use client';

import styles from './SubcategoryChips.module.css';

export const ALL = '__all__';

export default function SubcategoryChips({ category, selected, onSelect }) {
  if (!category) return null;

  const chips = [
    { value: ALL, label: `All ${category.label}` },
    ...category.subcategories.map((s) => ({ value: s, label: s })),
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
