import { supabase, isSupabaseConfigured } from './supabase';

// All public reads of the `businesses` table live here so components never
// hold raw queries. Rows are normalised into the shape the UI already spoke
// before Supabase existed (categoryId / blurb), which keeps ListingCard,
// ListingGrid and the detail page unchanged.

// Public columns only — contact_email and the stripe ids stay server-side.
const PUBLIC_COLUMNS = 'id, name, category, subcategory, website, description, photo_url, photo_urls, status, approved_at';

export function toListing(row) {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category,
    subcategory: row.subcategory,
    website: row.website,
    blurb: row.description,
    photoUrl: row.photo_url ?? row.photo_urls?.[0] ?? null,
    // Full ordered set; photo_url stays the first for older readers.
    photoUrls: row.photo_urls ?? (row.photo_url ? [row.photo_url] : []),
    status: row.status,
    listedSince: row.approved_at,
  };
}

/**
 * Live listings, newest approval first.
 * @returns {Promise<{ listings: object[], error: string|null }>}
 */
export async function fetchLiveListings() {
  if (!isSupabaseConfigured) {
    return { listings: [], error: 'Supabase is not configured.' };
  }

  const { data, error } = await supabase
    .from('businesses')
    .select(PUBLIC_COLUMNS)
    .eq('status', 'live')
    .order('approved_at', { ascending: false });

  if (error) {
    console.error('[businesses] fetchLiveListings failed', error);
    return { listings: [], error: 'Could not load listings.' };
  }

  return { listings: (data ?? []).map(toListing), error: null };
}

/**
 * A single live listing by id. `listing: null` means "no live row with that
 * id" — a bad id, or one that is still pending/rejected. Both render the same
 * not-found state, deliberately: the pending queue is not publicly probeable.
 */
export async function fetchLiveListingById(id) {
  if (!isSupabaseConfigured) {
    return { listing: null, error: 'Supabase is not configured.' };
  }

  const { data, error } = await supabase
    .from('businesses')
    .select(PUBLIC_COLUMNS)
    .eq('status', 'live')
    .eq('id', id)
    .maybeSingle(); // maybeSingle: 0 rows is a normal outcome, not an error

  if (error) {
    // 22P02 = invalid uuid syntax, i.e. a junk id in the URL. Not found, not broken.
    if (error.code === '22P02') return { listing: null, error: null };
    console.error('[businesses] fetchLiveListingById failed', error);
    return { listing: null, error: 'Could not load this listing.' };
  }

  return { listing: data ? toListing(data) : null, error: null };
}
