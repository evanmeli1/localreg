// Connectivity + schema check. Run with:
//   node --env-file=.env scripts/check-db.mjs
// Prints only table/bucket status — never key material.

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('project host:', new URL(url).host);

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

console.log('\n--- tables (service role) ---');
for (const table of ['businesses', 'events', 'change_requests']) {
  const { data, error } = await admin.from(table).select('id').limit(1);
  if (error) {
    console.log(`  ${table}: MISSING  [${error.code}] ${error.message}`);
  } else {
    const { count } = await admin
      .from(table)
      .select('*', { count: 'exact', head: true });
    console.log(`  ${table}: ok, ${count ?? 0} row(s)`);
  }
}

console.log('\n--- storage ---');
const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
if (bucketError) {
  console.log('  listBuckets error:', bucketError.message);
} else {
  const names = buckets.map((b) => b.id);
  const b = buckets.find((x) => x.id === 'business-photos');
  console.log('  existing buckets:', names.length ? names.join(', ') : '(none)');
  console.log('  business-photos:', b ? `ok (public=${b.public})` : 'MISSING');
}

console.log('\n--- RLS spot-check (anon key) ---');
const { data: anonBiz, error: anonBizErr } = await anon
  .from('businesses')
  .select('id, status');
console.log(
  '  select businesses:',
  anonBizErr
    ? `error [${anonBizErr.code}] ${anonBizErr.message}`
    : `${anonBiz.length} row(s) visible`,
);

// Careful reading this one: with RLS enabled and no policy, Postgres returns an
// EMPTY SET rather than an error. So "0 rows" only proves protection when the
// table actually has rows — compare against the service-role count below.
const { data: anonEvents, error: anonEventsErr } = await anon.from('events').select('id');
const { count: realEvents } = await admin
  .from('events')
  .select('*', { count: 'exact', head: true });

if (anonEventsErr) {
  console.log(`  select events: blocked [${anonEventsErr.code}]`);
} else if ((realEvents ?? 0) === 0) {
  console.log('  select events: 0 rows to anon, but the table is empty — inconclusive');
} else if (anonEvents.length === 0) {
  console.log(`  select events: 0 rows to anon while ${realEvents} exist — RLS working`);
} else {
  console.log(`  select events: ${anonEvents.length} rows VISIBLE to anon — RLS NOT working`);
}
