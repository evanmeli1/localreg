// Mock moderation queue for /admin. In the backend pass this becomes a
// Supabase query for submissions with status = 'pending'.

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** '2026-08-14' -> 'Aug 14, 2026'. Hand-formatted to avoid locale drift. */
export function formatSubmittedDate(value) {
  const [year, month, day] = value.split('-');
  return `${SHORT_MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
}

export const PENDING_SUBMISSIONS = [
  {
    id: 'sub-1041',
    name: 'Half Moon Bakehouse',
    categoryId: 'food',
    subcategory: 'Bakeries',
    submittedAt: '2026-08-14',
    email: 'hello@halfmoonbakehouse.com',
    description:
      'Sourdough, laminated pastry, and a line out the door by seven. Open Wednesday through Sunday.',
  },
  {
    id: 'sub-1042',
    name: 'Mirror Finish Detailing',
    categoryId: 'auto',
    subcategory: 'Detailing',
    submittedAt: '2026-08-14',
    email: 'book@mirrorfinishdetail.com',
    description:
      'Paint correction, ceramic coating, and interior deep cleans by appointment only.',
  },
  {
    id: 'sub-1043',
    name: 'Bright Hollow Cleaning Co.',
    categoryId: 'home',
    subcategory: 'Cleaning',
    submittedAt: '2026-08-15',
    email: 'team@brighthollowclean.com',
    description:
      'Recurring home cleans and move-out turnarounds. Fully insured crew, flat-rate pricing.',
  },
  {
    id: 'sub-1044',
    name: 'Copper Kettle Tea Room',
    categoryId: 'food',
    subcategory: 'Cafés',
    submittedAt: '2026-08-15',
    email: 'owner@copperkettletea.com',
    description:
      'Loose-leaf tea bar with a rotating scone menu and a quiet back room for working.',
  },
  {
    id: 'sub-1045',
    name: 'Ironwood Legal Group',
    categoryId: 'services',
    subcategory: 'Legal',
    submittedAt: '2026-08-16',
    email: 'intake@ironwoodlegal.com',
    description:
      'Small-business formation, contracts, and lease review. Free 20-minute consult.',
  },
  {
    id: 'sub-1046',
    name: 'Second Story Vintage',
    categoryId: 'retail',
    subcategory: 'Clothing',
    submittedAt: '2026-08-16',
    email: 'shop@secondstoryvintage.com',
    description:
      'Curated 70s–90s denim, workwear, and outerwear on the second floor of the Arcade building.',
  },
];
