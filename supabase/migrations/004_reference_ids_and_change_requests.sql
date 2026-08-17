-- Reference IDs on businesses, and verified change requests.
--
-- Until now /request-change accepted a free-text "business name or email" and
-- believed it: anyone could file a change against anyone's listing. The
-- reference_id is the shared secret that fixes that — generated at approval,
-- emailed to the owner, and required (together with a matching name/email) on
-- every change request. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. businesses.reference_id
--
-- Nullable: only approved listings have one, and it is stamped in the /admin
-- approve route (lib/admin-api.js), not at submission. NULLs do not collide
-- under a UNIQUE constraint in Postgres, so every pending row can hold NULL
-- while approved rows stay unique.
-- ---------------------------------------------------------------------------
alter table public.businesses add column if not exists reference_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'businesses_reference_id_key'
  ) then
    alter table public.businesses
      add constraint businesses_reference_id_key unique (reference_id);
  end if;
end $$;

-- The generator (lib/reference-id.js) always produces LR- plus exactly five
-- uppercase alphanumerics. This is the database's copy of that rule, so a bug
-- in the app can never store a malformed id that would then fail to match.
alter table public.businesses drop constraint if exists businesses_reference_id_format_check;
alter table public.businesses add constraint businesses_reference_id_format_check
  check (reference_id is null or reference_id ~ '^LR-[A-Z0-9]{5}$');

-- ---------------------------------------------------------------------------
-- 2. change_requests.business_id
--
-- Now that the submitter proves which listing is theirs, the request can be
-- linked to the real row instead of carrying an unverified string. ON DELETE
-- SET NULL keeps the request history if a listing is ever removed.
-- ---------------------------------------------------------------------------
alter table public.change_requests add column if not exists business_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'change_requests_business_id_fkey'
  ) then
    alter table public.change_requests
      add constraint change_requests_business_id_fkey
      foreign key (business_id) references public.businesses (id) on delete set null;
  end if;
end $$;

create index if not exists change_requests_business_id_idx
  on public.change_requests (business_id);

-- ---------------------------------------------------------------------------
-- 3. change_requests.photo_urls
--
-- Mirrors businesses.photo_urls, with the lower cap the change form applies
-- (LIMITS.changeRequestPhotoCount = 5).
-- ---------------------------------------------------------------------------
alter table public.change_requests add column if not exists photo_urls text[];

alter table public.change_requests drop constraint if exists change_requests_photo_urls_max_check;
alter table public.change_requests add constraint change_requests_photo_urls_max_check
  check (photo_urls is null or array_length(photo_urls, 1) <= 5);
