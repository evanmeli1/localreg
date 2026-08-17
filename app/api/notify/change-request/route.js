import { NextResponse } from 'next/server';
import { getAdminClient, isAdminConfigured } from '@/lib/supabase-admin';
import { COLORS, DISCORD_WEBHOOKS, notifyDiscord } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// The change request form is a client component, so it cannot hold the Discord
// webhook URL (a secret). It inserts the row itself via the anon key, then
// calls this route with only the row's id.
//
// The embed is built from the row read back through the service role rather
// than from the request body, so this endpoint cannot be used to push
// arbitrary text into the Discord channel — the worst an abuser can do is
// re-notify a change request that genuinely exists.

const DETAILS_PREVIEW_LIMIT = 200;

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

  const id = body?.id;
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'A change request id is required.' }, { status: 400 });
  }

  const client = getAdminClient();
  const { data: changeRequest, error } = await client
    .from('change_requests')
    .select('id, identifier, request_details')
    .eq('id', id)
    .maybeSingle();

  if (error && error.code !== '22P02') {
    console.error('[notify/change-request] lookup failed', error);
    return NextResponse.json({ error: 'Could not send the notification.' }, { status: 500 });
  }

  if (!changeRequest) {
    return NextResponse.json({ error: 'Unknown change request.' }, { status: 404 });
  }

  const details = changeRequest.request_details ?? '';
  const preview =
    details.length > DETAILS_PREVIEW_LIMIT
      ? `${details.slice(0, DETAILS_PREVIEW_LIMIT)}…`
      : details;

  await notifyDiscord(DISCORD_WEBHOOKS.signups, {
    title: '✏️ Change request received',
    color: COLORS.gray,
    fields: [
      { name: 'Identifier', value: changeRequest.identifier },
      { name: 'Request details', value: preview },
    ],
  });

  return NextResponse.json({ ok: true });
}
