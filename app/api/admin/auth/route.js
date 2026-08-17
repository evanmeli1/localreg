import { NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * Validates the admin password without ever shipping it to the browser.
 * The client keeps it in memory afterwards and replays it on each admin call
 * — see the auth caveats in lib/admin-api.js.
 */
export async function POST(request) {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: 'Admin access is not configured on the server.' },
      { status: 503 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!checkAdminPassword(body?.password)) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
