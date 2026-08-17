import { NextResponse } from 'next/server';
import { getAdminClient, isAdminConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// The `events` table is service-role only under RLS, so the public intake form
// cannot write to it directly. This route is the one narrow opening: it accepts
// only the event types a visitor can legitimately cause, and it ignores any
// caller-supplied metadata, so it can't be used to forge audit history.
const PUBLIC_EVENT_TYPES = new Set(['submission_created']);

export async function POST(request) {
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { event_type: eventType, business_id: businessId } = body ?? {};

  if (!PUBLIC_EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ error: 'Unsupported event type.' }, { status: 400 });
  }

  if (typeof businessId !== 'string' || !businessId) {
    return NextResponse.json({ error: 'A business id is required.' }, { status: 400 });
  }

  const client = getAdminClient();

  // Only log against a business that actually exists, so the endpoint can't be
  // used to fill the table with junk rows.
  const { data: business, error: lookupError } = await client
    .from('businesses')
    .select('id, stripe_customer_id')
    .eq('id', businessId)
    .maybeSingle();

  if (lookupError && lookupError.code !== '22P02') {
    console.error('[events] lookup failed', lookupError);
    return NextResponse.json({ error: 'Could not record the event.' }, { status: 500 });
  }

  if (!business) {
    return NextResponse.json({ error: 'Unknown business.' }, { status: 404 });
  }

  const { error } = await client.from('events').insert({
    event_type: eventType,
    business_id: business.id,
    stripe_customer_id: business.stripe_customer_id,
  });

  if (error) {
    console.error('[events] insert failed', error);
    return NextResponse.json({ error: 'Could not record the event.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
