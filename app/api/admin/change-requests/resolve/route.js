import { NextResponse } from 'next/server';
import { requireAdmin, logEvent } from '@/lib/admin-api';

export const dynamic = 'force-dynamic';

/**
 * Flips a change request's `resolved` flag.
 *
 * Bookkeeping only: it records that the admin has dealt with the request, and
 * deliberately does not touch the listing or notify the owner. Actually editing
 * the listing is a separate action (see /api/admin/businesses/update), because
 * "I have read this" and "I have changed the listing" are different facts and
 * conflating them would lose the distinction.
 *
 * Takes the desired state rather than toggling, so a double-click or a stale
 * tab cannot flip it back by accident.
 */
export async function POST(request) {
  const auth = requireAdmin(request);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const id = body?.id;
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'A change request id is required.' }, { status: 400 });
  }
  if (typeof body?.resolved !== 'boolean') {
    return NextResponse.json({ error: 'resolved must be true or false.' }, { status: 400 });
  }

  const { data, error } = await auth.client
    .from('change_requests')
    .update({ resolved: body.resolved })
    .eq('id', id)
    .select('id, resolved, business_id')
    .maybeSingle();

  if (error) {
    // 22P02 = malformed uuid.
    if (error.code === '22P02') {
      return NextResponse.json({ error: 'Unknown change request.' }, { status: 404 });
    }
    console.error('[admin/change-requests/resolve] update failed', error);
    return NextResponse.json({ error: 'Could not update that request.' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Unknown change request.' }, { status: 404 });
  }

  await logEvent(auth.client, {
    event_type: body.resolved ? 'change_request_resolved' : 'change_request_reopened',
    business_id: data.business_id,
    metadata: { change_request_id: data.id },
  });

  return NextResponse.json({ request: data });
}
