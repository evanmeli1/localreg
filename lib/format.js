// Date formatting shared by the listing detail page and the admin queue.
// Hand-rolled and pinned to UTC so a server render and a client render always
// produce the same string (toLocaleDateString would drift by timezone and
// trigger a hydration mismatch).

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

/** Timestamp -> 'March 2024'. Returns '' for null/unparseable input. */
export function formatListedSince(value) {
  const d = toDate(value);
  if (!d) return '';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Timestamp -> 'Aug 14, 2026'. Returns '' for null/unparseable input. */
export function formatSubmittedDate(value) {
  const d = toDate(value);
  if (!d) return '';
  const month = MONTHS[d.getUTCMonth()].slice(0, 3);
  return `${month} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
