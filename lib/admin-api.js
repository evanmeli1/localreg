import { NextResponse } from 'next/server';
import { getAdminClient, isAdminConfigured, checkAdminPassword } from './supabase-admin';
import { getCategory } from './categories';
import { COLORS, DISCORD_WEBHOOKS, notifyDiscord } from './discord';

// SERVER-ONLY — imports the service role client.
//
// ⚠️ PLACEHOLDER AUTH. Every admin route re-checks a shared password sent in
// the `x-admin-password` header. There are no sessions, no rate limiting, and
// no per-user identity, so a leaked password grants full moderation rights
// until it is rotated. It is checked here on the server rather than in the
// browser specifically so the password itself never ships in the client
// bundle — but this still needs to become real session-based auth (Supabase
// Auth + an admins table, or an SSO gate) before launch.

export const ADMIN_PASSWORD_HEADER = 'x-admin-password';

/**
 * Validates the request and hands back a service-role client.
 * @returns {{ error: NextResponse } | { client: object }}
 */
export function requireAdmin(request) {
  if (!process.env.ADMIN_PASSWORD) {
    return {
      error: NextResponse.json(
        { error: 'Admin access is not configured on the server.' },
        { status: 503 },
      ),
    };
  }

  if (!checkAdminPassword(request.headers.get(ADMIN_PASSWORD_HEADER))) {
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

  return { client: getAdminClient() };
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

  const patch =
    decision === 'approve'
      ? { status: 'live', approved_at: new Date().toISOString() }
      : { status: 'rejected' };

  // Guarded on status='pending' so a double-click (or a stale queue in a second
  // tab) can't re-decide a listing that was already handled.
  const { data, error } = await auth.client
    .from('businesses')
    .update(patch)
    .eq('id', id)
    .eq('status', 'pending')
    .select('id, name, status, category, subcategory')
    .maybeSingle();

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
      { error: 'That listing is no longer pending — it may have already been handled.' },
      { status: 409 },
    );
  }

  await logEvent(auth.client, {
    event_type: decision === 'approve' ? 'approved' : 'rejected',
    business_id: data.id,
    metadata: { name: data.name },
  });

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
