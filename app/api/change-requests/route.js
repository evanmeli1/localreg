import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getAdminClient, isAdminConfigured } from '@/lib/supabase-admin';
import { COLORS, DISCORD_WEBHOOKS, notifyDiscord } from '@/lib/discord';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateChangeRequest } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const DETAILS_PREVIEW_LIMIT = 200;

// Insert + notify for the change request form. Previously the browser inserted
// directly with the anon key and then asked a separate route to notify; doing
// both here means the message is built from validated values and the endpoint
// is rate limited.

export async function POST(request) {
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Change requests are not configured yet.' }, { status: 503 });
  }

  const limited = enforceRateLimit('changeRequest', request);
  if (limited) return limited;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const result = validateChangeRequest({
    identifier: body?.identifier,
    request_details: body?.request_details,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: Object.values(result.errors)[0], errors: result.errors },
      { status: 400 },
    );
  }

  const supabase = getAdminClient();
  const id = randomUUID();

  const { error } = await supabase.from('change_requests').insert({ id, ...result.value });

  if (error) {
    if (error.code === '23514') {
      console.error('[change-requests] DB constraint rejected a validated row', error);
      return NextResponse.json({ error: 'Some of those details are not valid.' }, { status: 400 });
    }
    console.error('[change-requests] insert failed', error);
    return NextResponse.json({ error: 'Could not send your request. Please try again.' }, { status: 500 });
  }

  const details = result.value.request_details;
  const preview =
    details.length > DETAILS_PREVIEW_LIMIT ? `${details.slice(0, DETAILS_PREVIEW_LIMIT)}…` : details;

  await notifyDiscord(DISCORD_WEBHOOKS.signups, {
    title: '✏️ Change request received',
    color: COLORS.gray,
    fields: [
      { name: 'Identifier', value: result.value.identifier },
      { name: 'Request details', value: preview },
    ],
  });

  return NextResponse.json({ ok: true });
}
