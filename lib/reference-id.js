// Listing reference IDs — the proof-of-ownership token for a live listing.
//
// One is generated when a listing is approved and sent in the approval email.
// /request-change requires it, which is what stops a stranger from filing
// changes against someone else's listing by guessing the business name.
//
// Isomorphic on purpose: the format rules are shared with the browser form, so
// this file uses Web Crypto (`crypto.getRandomValues`, present in Node 18+ and
// every browser) rather than `node:crypto`, and imports nothing server-only.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 5;

export const REFERENCE_ID_PREFIX = 'LR-';

/**
 * What generation produces and what the database CHECK constraint enforces:
 * LR- plus exactly five characters (8 total).
 */
export const GENERATED_REFERENCE_ID_RE = /^LR-[A-Z0-9]{5}$/;

/**
 * What the form accepts: 7-8 characters total. Slightly wider than the
 * generated shape so a shorter code from an earlier or later scheme is still
 * looked up rather than rejected on format alone — an id that passes this but
 * matches no row fails the lookup below with the same message, so nothing
 * leaks either way.
 */
export const REFERENCE_ID_RE = /^LR-[A-Z0-9]{4,5}$/;

/**
 * The single failure message for every verification outcome: bad format,
 * unknown id, or an id whose listing doesn't match the name/email given.
 * Deliberately identical in all three cases — a distinct "no such id" would
 * turn the form into an oracle for enumerating valid reference ids.
 */
export const VERIFICATION_FAILED_MESSAGE =
  "We couldn't verify that reference ID. Double check it against your approval email.";

/** Uppercases and strips whitespace so "lr-4x9k2" and "LR- 4X9K2" both work. */
export function normaliseReferenceId(raw) {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\s+/g, '').toUpperCase();
}

/** @returns {boolean} true if `value` is already normalised and well-formed. */
export function isReferenceIdFormat(value) {
  return REFERENCE_ID_RE.test(value);
}

/**
 * Cryptographically random code, e.g. "LR-4X9K2".
 *
 * Rejection sampling rather than a plain `% 36`: bytes 252-255 would otherwise
 * make A-D four times as likely as the rest of the alphabet. Uniqueness is
 * still enforced by the database — see the retry loop in lib/admin-api.js.
 */
export function generateReferenceId() {
  const limit = 256 - (256 % ALPHABET.length); // 252
  let code = '';

  while (code.length < CODE_LENGTH) {
    const bytes = new Uint8Array(CODE_LENGTH - code.length);
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= limit) continue; // biased tail — draw again instead of skewing
      code += ALPHABET[byte % ALPHABET.length];
      if (code.length === CODE_LENGTH) break;
    }
  }

  return `${REFERENCE_ID_PREFIX}${code}`;
}

/**
 * Normalises a business name for comparison: lowercase, "&" spelled out,
 * punctuation dropped, whitespace collapsed. "Nook & Cranny Coffee" and
 * "nook and cranny coffee." both become "nook and cranny coffee".
 */
function normaliseName(raw) {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Standard Levenshtein distance, two-row variant. */
function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = row;
  }

  return prev[b.length];
}

/**
 * Second half of the verification: does the "business name or email" the
 * submitter typed actually belong to the listing the reference id resolved to?
 *
 * A correct reference id alone is not enough — both must line up, so a leaked
 * or shoulder-surfed id is not by itself a licence to edit the listing.
 *
 * Tolerant of the ways people write their own name (case, "&" vs "and",
 * trailing "LLC", a typo or two) but not of a different business.
 *
 * @param {string} identifier  Untrusted input from the form.
 * @param {{name: string, contact_email: string}} business  The resolved row.
 */
export function identifierMatchesBusiness(identifier, business) {
  const submitted = String(identifier ?? '').trim();
  if (!submitted || !business) return false;

  // Email is compared verbatim (minus case): normalising punctuation away
  // would make "you@a.com" and "you@a.co" indistinguishable.
  const email = String(business.contact_email ?? '').trim().toLowerCase();
  if (email && submitted.toLowerCase() === email) return true;

  const storedName = normaliseName(business.name);
  const givenName = normaliseName(submitted);
  if (!storedName || !givenName) return false;
  if (storedName === givenName) return true;

  const [shorter, longer] =
    givenName.length <= storedName.length ? [givenName, storedName] : [storedName, givenName];

  // "Nook and Cranny" for "Nook and Cranny Coffee". The length floor keeps a
  // two-letter fragment from matching everything.
  if (shorter.length >= 5 && longer.includes(shorter)) return true;

  // Typo tolerance, scaled to length so short names still need to be exact.
  const tolerance = shorter.length >= 8 ? 2 : shorter.length >= 5 ? 1 : 0;
  return tolerance > 0 && editDistance(storedName, givenName) <= tolerance;
}
