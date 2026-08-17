-- Allow accented Latin characters in subcategory.
--
-- 003 constrained subcategory to letters, digits, spaces and basic punctuation
-- with no accents, which is wrong for a business directory: "Cafe" and
-- "Jalapeno Grill" spelled properly (with the accents) were rejected. It also
-- rejected one of our own fixed subcategories -- food's "Cafes" carries an
-- acute accent, so that row could never have been inserted.
--
-- CHECK constraints cannot be altered in place, so this drops and recreates it.
-- Mirrors FREE_TEXT_SUBCATEGORY_RE in lib/validation.js. Safe to re-run.

-- The three added ranges are the Latin-1 Supplement letters:
--   U+00C0-U+00D6  A-grave .. O-diaeresis
--   U+00D8-U+00F6  O-slash .. o-diaeresis
--   U+00F8-U+00FF  o-slash .. y-diaeresis
-- The gaps skip the only two non-letters in that block, U+00D7 (multiplication
-- sign) and U+00F7 (division sign).
--
-- Written as \u escapes rather than literal accented characters, so the file
-- stays pure ASCII and the constraint cannot be corrupted by the encoding of
-- whatever client pastes it in; PostgreSQL's regex engine expands them. Range
-- endpoints in a bracket expression are compared by character code, so the set
-- is exactly those letters regardless of the database's collation.
--
-- This is still a fixed character class, not open text: angle brackets, quotes,
-- slashes, parentheses and semicolons all remain outside it, so
-- '<script>alert(1)</script>' is rejected, as is anything over 40 characters.
alter table public.businesses drop constraint if exists businesses_subcategory_check;
alter table public.businesses add constraint businesses_subcategory_check
  check (
    char_length(subcategory) between 2 and 40
    and subcategory ~ '^[a-zA-Z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\s&\-,''.]+$'
  );
