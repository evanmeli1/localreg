// Category taxonomy for the directory.
// `tint` is the pastel circle background, `ink` the icon color inside it.
// Icon names map to @tabler/icons-react outline components (see CategoryRow).

export const CATEGORIES = [
  {
    id: 'food',
    label: 'Food',
    icon: 'coffee',
    tint: '#FFE6D4',
    ink: '#C2410C',
    subcategories: ['Cafés', 'Restaurants', 'Bakeries', 'Bars'],
  },
  {
    id: 'auto',
    label: 'Auto',
    icon: 'car',
    tint: '#DCE9FB',
    ink: '#1D4ED8',
    subcategories: [
      'Repair',
      'Detailing',
      'Tires',
      'Body Shop',
      'Glass & Windshield',
    ],
  },
  {
    id: 'retail',
    label: 'Retail',
    icon: 'bag',
    tint: '#EAE1FB',
    ink: '#6D28D9',
    subcategories: ['Clothing', 'Books', 'Gifts', 'Grocery'],
  },
  {
    id: 'home',
    label: 'Home',
    icon: 'flower',
    tint: '#D9F0E1',
    ink: '#15803D',
    subcategories: ['Landscaping', 'Cleaning', 'Plumbing', 'Interiors'],
  },
  {
    id: 'services',
    label: 'Services',
    icon: 'briefcase',
    tint: '#FBEDCF',
    ink: '#B45309',
    subcategories: ['Legal', 'Accounting', 'Marketing', 'Fitness'],
  },
];

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

/** Subcategory options for a category id — drives the intake form's second select. */
export function subcategoriesFor(id) {
  const category = getCategory(id);
  return category ? category.subcategories : [];
}
