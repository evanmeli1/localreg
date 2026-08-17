-- Adds 'cancelled' to the allowed businesses.status values.
--
-- Set by the Stripe webhook on customer.subscription.deleted. Distinct from
-- 'rejected' (we turned them down) — 'cancelled' means they stopped paying, so
-- the listing leaves the directory but the record and its history are kept.
--
-- The public read policy is unchanged and still matches only status = 'live',
-- so a cancelled listing disappears from the directory automatically.

alter table public.businesses
  drop constraint if exists businesses_status_check;

alter table public.businesses
  add constraint businesses_status_check
  check (status in ('pending', 'live', 'rejected', 'cancelled'));
