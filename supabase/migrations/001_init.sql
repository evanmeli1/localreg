-- localreg — initial schema
-- Tables: businesses, events, change_requests
-- Plus RLS policies and the public "business-photos" storage bucket.
--
-- Safe to re-run: every object is created with IF NOT EXISTS / guarded DO blocks.

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
create table if not exists public.businesses (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  name                text not null,
  category            text not null,
  subcategory         text not null,
  website             text,
  contact_email       text not null,
  description         text not null,
  photo_url           text,
  status              text not null default 'pending'
                        constraint businesses_status_check
                        check (status in ('pending', 'live', 'rejected')),
  -- These two UNIQUE constraints are the anti-double-submit guard: one payment
  -- can produce exactly one listing. Enforced by the database, not app logic —
  -- a second insert raises SQLSTATE 23505 no matter which client attempts it.
  stripe_customer_id  text not null unique,
  stripe_session_id   text not null unique,
  approved_at         timestamptz
);

-- Homepage reads live listings newest-first; admin reads the pending queue.
create index if not exists businesses_status_approved_at_idx
  on public.businesses (status, approved_at desc);

create index if not exists businesses_status_created_at_idx
  on public.businesses (status, created_at asc);

-- ---------------------------------------------------------------------------
-- events — append-only audit log
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  event_type          text not null,
  business_id         uuid references public.businesses (id) on delete set null,
  stripe_customer_id  text,
  metadata            jsonb
);

create index if not exists events_business_id_idx on public.events (business_id);
create index if not exists events_created_at_idx  on public.events (created_at desc);

-- ---------------------------------------------------------------------------
-- change_requests
-- ---------------------------------------------------------------------------
create table if not exists public.change_requests (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  identifier       text not null,
  request_details  text not null,
  resolved         boolean not null default false
);

create index if not exists change_requests_resolved_idx
  on public.change_requests (resolved, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- The service role key bypasses RLS entirely, so the policies below describe
-- what the ANON key may do. Everything else is server-side only.
-- ---------------------------------------------------------------------------
alter table public.businesses      enable row level security;
alter table public.events          enable row level security;
alter table public.change_requests enable row level security;

-- businesses: anyone may read live listings only. Pending and rejected rows
-- stay invisible to the public (they contain contact_email).
drop policy if exists "businesses_select_live" on public.businesses;
create policy "businesses_select_live"
  on public.businesses for select
  to anon, authenticated
  using (status = 'live');

-- businesses: the intake form inserts as anon. The WITH CHECK clause pins the
-- new row to 'pending' so a crafted client cannot self-approve into 'live'.
drop policy if exists "businesses_insert_pending" on public.businesses;
create policy "businesses_insert_pending"
  on public.businesses for insert
  to anon, authenticated
  with check (status = 'pending' and approved_at is null);

-- No UPDATE or DELETE policy for businesses: approve/reject run through the
-- service role in server-side API routes only.

-- events: no public access whatsoever. Zero policies = zero anon rows.
-- (RLS enabled with no policy denies everything except the service role.)

-- change_requests: anon may submit, and may not read anyone's requests back.
drop policy if exists "change_requests_insert_anon" on public.change_requests;
create policy "change_requests_insert_anon"
  on public.change_requests for insert
  to anon, authenticated
  with check (true);

-- ---------------------------------------------------------------------------
-- Storage bucket: business-photos (public read)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('business-photos', 'business-photos', true)
on conflict (id) do update set public = true;

-- Anyone can view a photo; the bucket is public-read by design.
drop policy if exists "business_photos_public_read" on storage.objects;
create policy "business_photos_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'business-photos');

-- The intake form uploads before the business row exists, so anon needs insert.
drop policy if exists "business_photos_anon_upload" on storage.objects;
create policy "business_photos_anon_upload"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'business-photos');
