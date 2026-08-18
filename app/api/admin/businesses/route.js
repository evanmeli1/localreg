import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-api';

export const dynamic = 'force-dynamic';

/**
 * Listings the admin can edit.
 *
 * Live rows only by default: editing a pending row belongs in the approval
 * queue, and a rejected or cancelled one is not on the directory to correct.
 * ?status=all opens it up when something needs looking at regardless.
 */
export async function GET(request) {
  const auth = requireAdmin(request);
  if (auth.error) return auth.error;

  const status = new URL(request.url).searchParams.get('status');

  let query = auth.client
    .from('businesses')
    .select(
      'id, name, category, subcategory, website, description, contact_email, photo_url, photo_urls, status, reference_id, created_at, approved_at',
    )
    .order('approved_at', { ascending: false, nullsFirst: false });

  if (status !== 'all') query = query.eq('status', 'live');

  const { data, error } = await query;

  if (error) {
    console.error('[admin/businesses] fetch failed', error);
    return NextResponse.json({ error: 'Could not load listings.' }, { status: 500 });
  }

  return NextResponse.json({ listings: data ?? [] });
}
