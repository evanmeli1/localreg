// Mock directory data. Replace with a Supabase query in the backend pass —
// keep the shape identical so components don't have to change.
//
// status:      'live'    -> paid + approved, shows the VERIFIED badge
//              'pending' -> submitted but not yet approved, no badge
// website:     bare domain; the detail page prefixes https:// for the href
// listedSince: 'YYYY-MM', rendered as "Month YYYY" by formatListedSince()

export const LISTINGS = [
  {
    id: 'nook-and-cranny-coffee',
    name: 'Nook & Cranny Coffee',
    categoryId: 'food',
    subcategory: 'Cafés',
    city: 'Eastside',
    status: 'live',
    website: 'nookandcrannycoffee.com',
    listedSince: '2024-03',
    blurb: 'Small-batch roaster and eight-seat espresso bar tucked behind the old mill.',
  },
  {
    id: 'salt-and-rye-kitchen',
    name: 'Salt & Rye Kitchen',
    categoryId: 'food',
    subcategory: 'Restaurants',
    city: 'Downtown',
    status: 'live',
    website: 'saltandrye.com',
    listedSince: '2023-11',
    blurb: 'Seasonal plates, an open kitchen, and a bread program worth the wait.',
  },
  {
    id: 'half-moon-bakehouse',
    name: 'Half Moon Bakehouse',
    categoryId: 'food',
    subcategory: 'Bakeries',
    city: 'Riverbend',
    status: 'pending',
    website: 'halfmoonbakehouse.com',
    listedSince: '2025-06',
    blurb: 'Sourdough, laminated pastry, and a line out the door by seven.',
  },
  {
    id: 'redline-auto-repair',
    name: 'Redline Auto Repair',
    categoryId: 'auto',
    subcategory: 'Repair',
    city: 'North Yard',
    status: 'live',
    website: 'redlineautorepair.com',
    listedSince: '2023-08',
    blurb: 'Independent shop doing diagnostics, brakes, and timing belts since 1998.',
  },
  {
    id: 'mirror-finish-detailing',
    name: 'Mirror Finish Detailing',
    categoryId: 'auto',
    subcategory: 'Detailing',
    city: 'Southgate',
    status: 'pending',
    website: 'mirrorfinishdetail.com',
    listedSince: '2025-09',
    blurb: 'Paint correction, ceramic coating, and interior deep cleans by appointment.',
  },
  {
    id: 'paper-lantern-books',
    name: 'Paper Lantern Books',
    categoryId: 'retail',
    subcategory: 'Books',
    city: 'Downtown',
    status: 'live',
    website: 'paperlanternbooks.com',
    listedSince: '2024-01',
    blurb: 'Used and new titles across two floors, with a staff-picks wall that turns weekly.',
  },
  {
    id: 'thistle-and-thread',
    name: 'Thistle & Thread',
    categoryId: 'retail',
    subcategory: 'Clothing',
    city: 'Old Town',
    status: 'live',
    website: 'thistleandthread.shop',
    listedSince: '2024-07',
    blurb: 'Independent label clothing plus in-house alterations and repairs.',
  },
  {
    id: 'cedar-path-landscaping',
    name: 'Cedar Path Landscaping',
    categoryId: 'home',
    subcategory: 'Landscaping',
    city: 'Westfield',
    status: 'live',
    website: 'cedarpathlandscaping.com',
    listedSince: '2023-05',
    blurb: 'Design, planting, and year-round maintenance for small residential lots.',
  },
  {
    id: 'bright-hollow-cleaning',
    name: 'Bright Hollow Cleaning Co.',
    categoryId: 'home',
    subcategory: 'Cleaning',
    city: 'Riverbend',
    status: 'pending',
    website: 'brighthollowclean.com',
    listedSince: '2025-10',
    blurb: 'Recurring home cleans and move-out turnarounds, fully insured crew.',
  },
  {
    id: 'harbor-point-accounting',
    name: 'Harbor Point Accounting',
    categoryId: 'services',
    subcategory: 'Accounting',
    city: 'Downtown',
    status: 'live',
    website: 'harborpointcpa.com',
    listedSince: '2024-02',
    blurb: 'Bookkeeping and tax prep for sole proprietors and small partnerships.',
  },
];

export function getListing(id) {
  return LISTINGS.find((l) => l.id === id) || null;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** '2024-03' -> 'March 2024'. Formatted by hand so server and client agree. */
export function formatListedSince(value) {
  if (!value) return '';
  const [year, month] = value.split('-');
  const name = MONTHS[Number(month) - 1];
  return name ? `${name} ${year}` : year;
}
