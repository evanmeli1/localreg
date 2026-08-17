import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-api';

export const dynamic = 'force-dynamic';

/**
 * The pending moderation queue, oldest first.
 * Service-role only: RLS hides non-live rows from the anon key, and these rows
 * carry contact emails.
 */
export async function GET(request) {
  const auth = requireAdmin(request);
  if (auth.error) return auth.error;

  const { data, error } = await auth.client
    .from('businesses')
    .select('id, name, category, subcategory, description, contact_email, website, photo_url, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[admin/listings] fetch failed', error);
    return NextResponse.json({ error: 'Could not load the queue.' }, { status: 500 });
  }

  return NextResponse.json({ listings: data ?? [] });
}
