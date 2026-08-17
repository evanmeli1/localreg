'use client';

import {
  IconBriefcase,
  IconCar,
  IconCoffee,
  IconFlower,
  IconGridDots,
  IconShoppingBag,
} from '@tabler/icons-react';
import { CATEGORIES } from '@/lib/categories';
import styles from './CategoryRow.module.css';

const ICONS = {
  coffee: IconCoffee,
  car: IconCar,
  bag: IconShoppingBag,
  flower: IconFlower,
  briefcase: IconBriefcase,
  grid: IconGridDots,
};

export default function CategoryRow({ selectedId, onSelect }) {
  return (
    <div className={`${styles.row} scroll-x`}>
      {CATEGORIES.map((cat) => {
        const Icon = ICONS[cat.icon];
        const selected = cat.id === selectedId;

        return (
          <button
            key={cat.id}
            type="button"
            className={`${styles.item} ${selected ? styles.selected : ''}`}
            aria-pressed={selected}
            // Clicking the active category clears the filter.
            onClick={() => onSelect(selected ? null : cat.id)}
          >
            <span
              className={styles.circle}
              style={
                selected
                  ? { background: 'var(--ink)', color: 'var(--white)' }
                  : { background: cat.tint, color: cat.ink }
              }
            >
              <Icon size={21} stroke={1.75} />
            </span>
            <span className={styles.label}>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
