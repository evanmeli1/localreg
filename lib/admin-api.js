import { NextResponse } from 'next/server';
import { getAdminClient, isAdminConfigured } from './supabase-admin';
import { getSessionFromRequest, isSessionConfigured } from './adminAuth';
import { getCategory } from './categories';
import { COLORS, DISCORD_WEBHOOKS, notifyDiscord } from './discord';
import { sendApprovalEmail } from './email';
import { generateReferenceId } from './reference-id';

// Codes are drawn from 36^5 ≈ 60 million, so a collision needs a second
// attempt roughly never. The retry exists because "never" isn't "can't".
const REFERENCE_ID_ATTEMPTS = 5;

const DECISION_COLUMNS = 'id, name, status, category, subcategory, contact_email, reference_id';

// SERVER-ONLY — imports the service role client.
//
// Every admin route is gated on a signed session cookie, verified here on the
// server. Nothing the client sends other than that cookie is trusted: there is
// no header, flag or body field that can stand in for a session.

/**
 * Validates the session and hands back a service-role client.
 * @returns {{ error: NextResponse } | { client: object, session: object }}
 */
export function requireAdmin(request) {
  if (!isSessionConfigured) {
    return {
      error: NextResponse.json(
        { error: 'Admin access is not configured on the server.' },
        { status: 503 },
      ),
    };
  }

  const session = getSessionFromRequest(request);
  if (!session) {
    return {
      error: NextResponse.json({ error: 'Not authorised.' }, { status: 401 }),
    };
  }

  if (!isAdminConfigured) {
    return {
      error: NextResponse.json(
        { error: 'The database is not configured on the server.' },
        { status: 503 },
      ),
    };
  }

  return { client: getAdminClient(), session };
}

/**
 * Shared body of the approve and reject routes — they differ only in the
 * resulting status, whether approved_at is stamped, and the event type.
 */
export async function handleDecision(request, decision) {
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
    return NextResponse.json({ error: 'A listing id is required.' }, { status: 400 });
  }

  // Guarded on status='pending' so a double-click (or a stale queue in a second
  // tab) can't re-decide a listing that was already handled. That guard is also
  // what makes the reference id a one-time stamp: a listing can only be
  // approved once, so an existing id is never overwritten.
  const update = (patch) =>
    auth.client
      .from('businesses')
      .update(patch)
      .eq('id', id)
      .eq('status', 'pending')
      .select(DECISION_COLUMNS)
      .maybeSingle();

  let data = null;
  let error = null;

  if (decision === 'approve') {
    for (let attempt = 1; attempt <= REFERENCE_ID_ATTEMPTS; attempt += 1) {
      // The reference id is minted here, at approval — a pending listing has
      // none, so a rejected submission never gets one.
      ({ data, error } = await update({
        status: 'live',
        approved_at: new Date().toISOString(),
        reference_id: generateReferenceId(),
      }));

      // 23505 = the unique constraint caught a code that already exists.
      if (error?.code !== '23505') break;

      console.warn(`[admin/approve] reference id collision (attempt ${attempt}) — regenerating`);
      if (attempt === REFERENCE_ID_ATTEMPTS) {
        console.error('[admin/approve] could not generate a unique reference id');
        return NextResponse.json({ error: 'Could not update the listing.' }, { status: 500 });
      }
    }
  } else {
    ({ data, error } = await update({ status: 'rejected' }));
  }

  if (error) {
    // 22P02 = malformed uuid.
    if (error.code === '22P02') {
      return NextResponse.json({ error: 'Unknown listing.' }, { status: 404 });
    }
    console.error(`[admin/${decision}] update failed`, error);
    return NextResponse.json({ error: 'Could not update the listing.' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: 'That listing is no longer pending. It may have already been handled.' },
      { status: 409 },
    );
  }

  await logEvent(auth.client, {
    event_type: decision === 'approve' ? 'approved' : 'rejected',
    business_id: data.id,
    // The reference id is recorded in the audit log too, so it can be recovered
    // for an owner who lost the email without digging through the row history.
    metadata:
      decision === 'approve'
        ? { name: data.name, reference_id: data.reference_id }
        : { name: data.name },
  });

  // "You're approved and live", carrying the reference id the owner will need
  // for /request-change. Best-effort: a mail failure must not undo an approval.
  if (decision === 'approve') {
    await sendApprovalEmail({
      to: data.contact_email,
      businessName: data.name,
      referenceId: data.reference_id,
    });
  }

  // Post to the signups channel. Only reached when a row actually changed
  // state, so a double-click can't produce a duplicate notification.
  const category = getCategory(data.category);
  await notifyDiscord(
    DISCORD_WEBHOOKS.signups,
    decision === 'approve'
      ? {
          title: '✅ Listing approved and live',
          color: COLORS.green,
          fields: [
            { name: 'Business name', value: data.name },
            { name: 'Category', value: category ? category.label : data.category },
            { name: 'Reference ID', value: data.reference_id },
          ],
        }
      : {
          title: '❌ Listing rejected',
          color: COLORS.gray,
          fields: [{ name: 'Business name', value: data.name }],
        },
  );

  return NextResponse.json({ listing: data });
}

/** Logs to the append-only events table. Never throws — auditing is best-effort. */
export async function logEvent(client, { event_type, business_id = null, stripe_customer_id = null, metadata = null }) {
  const { error } = await client
    .from('events')
    .insert({ event_type, business_id, stripe_customer_id, metadata });

  if (error) console.error('[events] insert failed', event_type, error);
}
