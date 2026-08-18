import { CATEGORIES, subcategoriesFor, usesFreeTextSubcategory } from './categories';
import {
  isReferenceIdFormat,
  normaliseReferenceId,
  VERIFICATION_FAILED_MESSAGE,
} from './reference-id';

// Single source of truth for input rules, shared by every route that writes
// user-supplied data. Client-side maxLength attributes are a UX affordance
// only — anyone can POST straight to the API, so these run server-side before
// anything reaches the database.
//
// Hand-rolled rather than pulling in zod: the rules are simple and the
// per-field messages are bespoke, so a schema library would add a dependency
// without shortening this much.

export const LIMITS = {
  name: { min: 2, max: 100 },
  website: { max: 200 },
  email: { max: 254 }, // RFC 5321 maximum
  description: { min: 10, max: 160 },
  identifier: { min: 2, max: 150 },
  requestDetails: { min: 10, max: 500 },
  photoBytes: 5 * 1024 * 1024, // 5MB
  freeTextSubcategory: { min: 2, max: 40 },
  photoCount: 10,
  // Change requests are edits, not a re-listing, so they get a smaller cap
  // than the intake form's 10.
  changeRequestPhotoCount: 5,
};

// Allowlist for the free-text subcategory on "Other": letters, digits, spaces
// and a few punctuation marks businesses actually use. Everything else is
// rejected outright, so angle brackets, quotes and slashes never get in —
// markup like <script> cannot survive this even before JSX escaping.
//
// The À-ÖØ-öø-ÿ ranges are the Latin-1 Supplement letters (é, ñ, ü, ç, ß …),
// so "Café" and "Jalapeño Grill" are accepted. The two gaps skip × (U+00D7)
// and ÷ (U+00F7), the only non-letters in that block. Still a fixed character
// class, not open text: nothing structural gets through.
const FREE_TEXT_SUBCATEGORY_RE = /^[a-zA-Z0-9À-ÖØ-öø-ÿ\s&\-,'.]+$/;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Deliberately pragmatic: one @, no whitespace, a dot in the domain, and a
// 2+ char TLD. Full RFC 5322 is famously unreadable and rejects almost nothing
// extra in practice.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Accepts "example.com" or a full URL and returns a normalised absolute URL.
 * @returns {{ok: true, value: string}|{ok: false, message: string}}
 */
export function normaliseWebsite(raw) {
  const input = asString(raw);
  if (!input) return { ok: true, value: null };

  if (input.length > LIMITS.website.max) {
    return { ok: false, message: `Website must be under ${LIMITS.website.max} characters.` };
  }

  // Bare domains are the common case in this form, so prepend rather than reject.
  const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`;

  let url;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, message: 'Enter a valid website address.' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, message: 'Website must start with http:// or https://.' };
  }
  // Rejects "https://localhost", "https://foo" and similar non-addresses.
  if (!/^[^.\s]+(\.[^.\s]+)+$/.test(url.hostname)) {
    return { ok: false, message: 'Enter a valid website address.' };
  }
  if (candidate.length > LIMITS.website.max) {
    return { ok: false, message: `Website must be under ${LIMITS.website.max} characters.` };
  }

  return { ok: true, value: url.toString() };
}

/**
 * The listing fields shared by the public intake form and the admin edit form:
 * name, category, subcategory, website, description.
 *
 * Contact email is deliberately NOT here — intake collects it, the admin edit
 * form does not touch it. Everything else lives in this one function so an
 * admin edit cannot drift into laxer rules than a public submission: same
 * limits, same allowlists, same messages.
 *
 * Mutates `errors` and `value` rather than returning, so callers can add their
 * own extra fields around it.
 */
function applyListingFields(input, errors, value) {
  const name = asString(input.name);
  if (!name) errors.name = 'Business name is required.';
  else if (name.length < LIMITS.name.min) errors.name = `Business name must be at least ${LIMITS.name.min} characters.`;
  else if (name.length > LIMITS.name.max) errors.name = `Business name must be under ${LIMITS.name.max} characters.`;
  else value.name = name;

  // Allowlist, not free text — the category drives public filtering.
  const category = asString(input.category);
  const validCategory = CATEGORIES.some((c) => c.id === category);
  if (!category) errors.category = 'Category is required.';
  else if (!validCategory) errors.category = 'Choose a valid category.';
  else value.category = category;

  // Collapse runs of whitespace before any length check, so "Pet    grooming"
  // is stored (and measured) as "Pet grooming". NFC composes decomposed input
  // ("e" + U+0301) into single characters ("é"), which some keyboards and
  // pasted text produce — without it the accent arrives as a combining mark
  // that is outside the allowlist below, and "Café" would be rejected.
  const subcategory = asString(input.subcategory).normalize('NFC').replace(/\s+/g, ' ');
  const freeText = validCategory && usesFreeTextSubcategory(category);

  if (!subcategory) {
    errors.subcategory = freeText ? 'Describe your category.' : 'Subcategory is required.';
  } else if (!validCategory) {
    errors.subcategory = 'Choose a category first.';
  } else if (freeText) {
    const { min, max } = LIMITS.freeTextSubcategory;
    if (subcategory.length < min) {
      errors.subcategory = `Category description must be at least ${min} characters.`;
    } else if (subcategory.length > max) {
      errors.subcategory = `Category description must be under ${max} characters.`;
    } else if (!FREE_TEXT_SUBCATEGORY_RE.test(subcategory)) {
      errors.subcategory = 'Use only letters, numbers, spaces and basic punctuation.';
    } else {
      value.subcategory = subcategory;
    }
  } else if (!subcategoriesFor(category).includes(subcategory)) {
    // Checked against this category's own list, so "food + Mechanic" is
    // rejected even though "Mechanic" is a real subcategory elsewhere.
    errors.subcategory = 'Choose a subcategory that belongs to the selected category.';
  } else {
    value.subcategory = subcategory;
  }

  const website = normaliseWebsite(input.website);
  if (!website.ok) errors.website = website.message;
  else value.website = website.value;

  const description = asString(input.description);
  if (!description) errors.description = 'Description is required.';
  else if (description.length < LIMITS.description.min) errors.description = `Description must be at least ${LIMITS.description.min} characters.`;
  else if (description.length > LIMITS.description.max) errors.description = `Description must be under ${LIMITS.description.max} characters.`;
  else value.description = description;
}

/**
 * Validates an intake-form submission.
 * @returns {{ok: true, value: object}|{ok: false, errors: Record<string,string>}}
 */
export function validateSubmission(input) {
  const errors = {};
  const value = {};

  applyListingFields(input, errors, value);

  const email = asString(input.contact_email);
  if (!email) errors.contact_email = 'Contact email is required.';
  else if (email.length > LIMITS.email.max) errors.contact_email = `Email must be under ${LIMITS.email.max} characters.`;
  else if (!EMAIL_RE.test(email)) errors.contact_email = 'Enter a valid email address.';
  else value.contact_email = email;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}

/**
 * Validates an admin edit of an existing listing.
 *
 * Same rules as a public submission minus the contact email, because it shares
 * applyListingFields with validateSubmission. Being the admin is not a reason
 * to accept a 300-character description or a subcategory that does not belong
 * to its category.
 *
 * @returns {{ok: true, value: object}|{ok: false, errors: Record<string,string>}}
 */
export function validateBusinessEdit(input) {
  const errors = {};
  const value = {};

  applyListingFields(input, errors, value);

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}

/**
 * Validates a change request.
 *
 * `referenceId` comes back alongside `value` rather than inside it: it is the
 * lookup key for the business, not a column on change_requests. The row stores
 * the resolved business_id instead — see app/api/change-requests/route.js.
 *
 * @returns {{ok: true, value: object, referenceId: string}
 *          |{ok: false, errors: Record<string,string>}}
 */
export function validateChangeRequest(input) {
  const errors = {};
  const value = {};

  // A malformed id gets the same message as an unknown one. Telling the user
  // "that's not the right shape" would confirm the shape of real ids.
  const referenceId = normaliseReferenceId(input.reference_id);
  if (!referenceId) errors.reference_id = 'Enter the reference ID from your approval email.';
  else if (!isReferenceIdFormat(referenceId)) errors.reference_id = VERIFICATION_FAILED_MESSAGE;

  const identifier = asString(input.identifier);
  if (!identifier) errors.identifier = 'Tell us which listing this is.';
  else if (identifier.length < LIMITS.identifier.min) errors.identifier = `This must be at least ${LIMITS.identifier.min} characters.`;
  else if (identifier.length > LIMITS.identifier.max) errors.identifier = `This must be under ${LIMITS.identifier.max} characters.`;
  else value.identifier = identifier;

  const details = asString(input.request_details);
  if (!details) errors.request_details = 'Describe the change you want.';
  else if (details.length < LIMITS.requestDetails.min) errors.request_details = `Please give at least ${LIMITS.requestDetails.min} characters of detail.`;
  else if (details.length > LIMITS.requestDetails.max) errors.request_details = `Request must be under ${LIMITS.requestDetails.max} characters.`;
  else value.request_details = details;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value, referenceId };
}

/**
 * Identifies an image from its magic bytes.
 *
 * The browser-reported MIME type is derived from the file extension and is
 * trivially spoofed — renaming notes.txt to photo.png makes it arrive as
 * image/png. Sniffing the actual header is what makes the type check real.
 *
 * @returns {string|null} detected MIME type, or null if unrecognised
 */
export function sniffImageType(buffer) {
  const b = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (b.length < 12) return null;

  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';

  if (
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  return null;
}

/**
 * Validates an uploaded photo by size and true content type.
 * @returns {{ok: true, type: string, extension: string}|{ok: false, message: string}}
 */
export function validatePhoto(buffer, declaredType) {
  if (buffer.byteLength > LIMITS.photoBytes) {
    return { ok: false, message: 'Photo must be 5MB or smaller.' };
  }
  if (buffer.byteLength === 0) {
    return { ok: false, message: 'That photo appears to be empty.' };
  }

  const actualType = sniffImageType(buffer);
  if (!actualType || !ALLOWED_IMAGE_TYPES.includes(actualType)) {
    return { ok: false, message: 'Photo must be a JPEG, PNG or WebP image.' };
  }
  // A mismatch means the extension lied about the contents; trust the bytes.
  if (declaredType && declaredType !== actualType) {
    return { ok: false, message: 'Photo must be a JPEG, PNG or WebP image.' };
  }

  const extension = actualType === 'image/jpeg' ? 'jpg' : actualType === 'image/png' ? 'png' : 'webp';
  return { ok: true, type: actualType, extension };
}
