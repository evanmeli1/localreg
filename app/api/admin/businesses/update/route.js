import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireAdmin, logEvent } from '@/lib/admin-api';
import { LIMITS, validateBusinessEdit, validatePhoto } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const PHOTO_BUCKET = 'business-photos';

// Admin edit of an existing listing.
//
// Runs the SAME validation as the public intake form (validateBusinessEdit and
// validateSubmission share applyListingFields), so being the admin buys a way
// in, not a way around the rules. A 300-character description is rejected here
// exactly as it is on /welcome, and the database CHECK constraints remain the
// backstop underneath.
//
// Multipart, because photos can come with the edit.

export async function POST(request) {
  const auth = requireAdmin(request);
  if (auth.error) return auth.error;

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const id = form.get('id');
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'A listing id is required.' }, { status: 400 });
  }

  const result = validateBusinessEdit({
    name: form.get('name'),
    category: form.get('category'),
    subcategory: form.get('subcategory'),
    website: form.get('website'),
    description: form.get('description'),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: Object.values(result.errors)[0], errors: result.errors },
      { status: 400 },
    );
  }

  // The row has to exist before anything is uploaded on its behalf.
  const { data: existing, error: lookupError } = await auth.client
    .from('businesses')
    .select('id, name, photo_urls, photo_url, status')
    .eq('id', id)
    .maybeSingle();

  if (lookupError) {
    if (lookupError.code === '22P02') {
      return NextResponse.json({ error: 'Unknown listing.' }, { status: 404 });
    }
    console.error('[admin/businesses/update] lookup failed', lookupError);
    return NextResponse.json({ error: 'Could not load that listing.' }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Unknown listing.' }, { status: 404 });
  }

  // ---- photos -------------------------------------------------------------
  // The client sends back the subset of existing URLs to keep; anything absent
  // is being removed. Intersected with what is actually on the row so a stale
  // tab cannot introduce a URL that was never there.
  const currentPhotos = existing.photo_urls ?? (existing.photo_url ? [existing.photo_url] : []);
  const requestedKeep = form.getAll('keep_photos').filter((v) => typeof v === 'string');
  const kept = currentPhotos.filter((url) => requestedKeep.includes(url));

  const files = form
    .getAll('photos')
    .filter((f) => f && typeof f === 'object' && typeof f.arrayBuffer === 'function' && f.size > 0);

  if (kept.length + files.length > LIMITS.photoCount) {
    const message = `A listing can have up to ${LIMITS.photoCount} photos (this would be ${kept.length + files.length}).`;
    return NextResponse.json({ error: message, errors: { photos: message } }, { status: 400 });
  }

  // Validate every new file before uploading any of them, so a bad last file
  // does not leave earlier ones orphaned in Storage.
  const prepared = [];
  for (const [index, file] of files.entries()) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const checked = validatePhoto(buffer, file.type || null);
    if (!checked.ok) {
      const message = files.length > 1 ? `Photo ${index + 1}: ${checked.message}` : checked.message;
      return NextResponse.json({ error: message, errors: { photos: message } }, { status: 400 });
    }
    prepared.push({ buffer, checked });
  }

  const uploaded = [];
  for (const { buffer, checked } of prepared) {
    // Server-generated path, as everywhere else — nothing the uploader chose
    // shapes the storage key.
    const objectPath = `admin-edits/${id}/${randomUUID()}.${checked.extension}`;
    const { error: uploadError } = await auth.client.storage
      .from(PHOTO_BUCKET)
      .upload(objectPath, buffer, { cacheControl: '3600', upsert: false, contentType: checked.type });

    if (uploadError) {
      console.error('[admin/businesses/update] photo upload failed', uploadError);
      continue; // Non-fatal: the text edit is still worth saving.
    }
    uploaded.push(auth.client.storage.from(PHOTO_BUCKET).getPublicUrl(objectPath).data.publicUrl);
  }

  const photoUrls = [...kept, ...uploaded];

  // Removing a photo unlinks it from the listing; the object is left in the
  // bucket rather than deleted. Unlinking is reversible, deleting is not, and
  // an admin mis-click should not destroy an owner's upload.
  const { data: updated, error } = await auth.client
    .from('businesses')
    .update({
      ...result.value,
      photo_urls: photoUrls.length > 0 ? photoUrls : null,
      photo_url: photoUrls[0] ?? null,
    })
    .eq('id', id)
    .select('id, name, category, subcategory, website, description, photo_url, photo_urls, status, reference_id')
    .maybeSingle();

  if (error) {
    // 23514 = a CHECK constraint caught something validation missed.
    if (error.code === '23514') {
      console.error('[admin/businesses/update] DB constraint rejected a validated edit', error);
      return NextResponse.json({ error: 'Some of those details are not valid.' }, { status: 400 });
    }
    console.error('[admin/businesses/update] update failed', error);
    return NextResponse.json({ error: 'Could not save that edit.' }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: 'Unknown listing.' }, { status: 404 });
  }

  await logEvent(auth.client, {
    event_type: 'listing_edited_by_admin',
    business_id: updated.id,
    metadata: {
      name: updated.name,
      photos_kept: kept.length,
      photos_added: uploaded.length,
      photos_removed: currentPhotos.length - kept.length,
    },
  });

  return NextResponse.json({ listing: updated });
}
