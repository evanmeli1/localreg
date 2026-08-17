-- Input-validation backstop, the "Other" category, and multi-photo support.
--
-- Application validation (lib/validation.js) is the primary gate; these
-- constraints are the last line of defence if that is ever bypassed or buggy.
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Field limits on businesses (mirrors LIMITS in lib/validation.js)
-- ---------------------------------------------------------------------------
alter table public.businesses drop constraint if exists businesses_name_length_check;
alter table public.businesses add constraint businesses_name_length_check
  check (char_length(name) between 2 and 100);

alter table public.businesses drop constraint if exists businesses_description_length_check;
alter table public.businesses add constraint businesses_description_length_check
  check (char_length(description) between 10 and 160);

alter table public.businesses drop constraint if exists businesses_email_length_check;
alter table public.businesses add constraint businesses_email_length_check
  check (char_length(contact_email) between 3 and 254 and contact_email like '%@%.%');

alter table public.businesses drop constraint if exists businesses_website_length_check;
alter table public.businesses add constraint businesses_website_length_check
  check (website is null or char_length(website) <= 200);

-- Category allowlist, now including 'other'.
alter table public.businesses drop constraint if exists businesses_category_check;
alter table public.businesses add constraint businesses_category_check
  check (category in ('food', 'auto', 'retail', 'home', 'services', 'other'));

-- Subcategory: length plus the same character allowlist the free-text
-- "Other" input uses. The fixed categories' values all satisfy this too.
alter table public.businesses drop constraint if exists businesses_subcategory_check;
alter table public.businesses add constraint businesses_subcategory_check
  check (
    char_length(subcategory) between 2 and 40
    and subcategory ~ '^[a-zA-Z0-9\s&\-,''.]+$'
  );

-- ---------------------------------------------------------------------------
-- 2. Multi-photo support
-- ---------------------------------------------------------------------------
alter table public.businesses add column if not exists photo_urls text[];

-- photo_url stays as the primary/first image for backwards compatibility;
-- photo_urls holds the full ordered set.
alter table public.businesses drop constraint if exists businesses_photo_urls_max_check;
alter table public.businesses add constraint businesses_photo_urls_max_check
  check (photo_urls is null or array_length(photo_urls, 1) <= 10);

-- ---------------------------------------------------------------------------
-- 3. Field limits on change_requests
-- ---------------------------------------------------------------------------
alter table public.change_requests drop constraint if exists change_requests_identifier_check;
alter table public.change_requests add constraint change_requests_identifier_check
  check (char_length(identifier) between 2 and 150);

alter table public.change_requests drop constraint if exists change_requests_details_check;
alter table public.change_requests add constraint change_requests_details_check
  check (char_length(request_details) between 10 and 500);

-- ---------------------------------------------------------------------------
-- 4. Close the client-side write bypass
--
-- Both forms now submit through server routes (/api/submissions and
-- /api/change-requests) that validate, rate limit and inspect uploads before
-- writing with the service role. Leaving the anon INSERT policies in place
-- would let anyone use the publicly-shipped anon key to insert directly and
-- skip every one of those checks, which would defeat this migration's purpose.
-- ---------------------------------------------------------------------------
drop policy if exists "businesses_insert_pending" on public.businesses;
drop policy if exists "change_requests_insert_anon" on public.change_requests;

-- Uploads are likewise server-side only now (validated for size and real
-- content type first), so anon no longer needs write access to the bucket.
-- Public READ remains, since listing photos are shown to everyone.
drop policy if exists "business_photos_anon_upload" on storage.objects;
