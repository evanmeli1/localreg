import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-api';

export const dynamic = 'force-dynamic';

/**
 * Every change request, newest first, with the business it points at.
 *
 * Service-role only: RLS hides this table from the anon key entirely, and the
 * rows carry what an owner wrote about their own listing.
 *
 * business_id is nullable (the FK is ON DELETE SET NULL), so a request whose
 * listing was later deleted still lists — with no business attached rather than
 * vanishing from the queue.
 */
export async function GET(request) {
  const auth = requireAdmin(request);
  if (auth.error) return auth.error;

  const { data, error } = await auth.client
    .from('change_requests')
    .select(
      'id, created_at, identifier, request_details, photo_urls, resolved, business_id, businesses ( id, name, category, subcategory, status, reference_id )',
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin/change-requests] fetch failed', error);
    return NextResponse.json({ error: 'Could not load change requests.' }, { status: 500 });
  }

  return NextResponse.json({ requests: data ?? [] });
}
