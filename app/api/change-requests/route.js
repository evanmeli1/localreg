import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getAdminClient, isAdminConfigured } from '@/lib/supabase-admin';
import { COLORS, DISCORD_WEBHOOKS, notifyDiscord } from '@/lib/discord';
import { enforceRateLimit } from '@/lib/rate-limit';
import { LIMITS, validateChangeRequest, validatePhoto } from '@/lib/validation';
import { identifierMatchesBusiness, VERIFICATION_FAILED_MESSAGE } from '@/lib/reference-id';

export const dynamic = 'force-dynamic';

const DETAILS_PREVIEW_LIMIT = 200;
const PHOTO_BUCKET = 'business-photos';

// Insert + notify for the change request form.
//
// The important part of this route is ownership: a change request is only
// created when the submitter supplies BOTH the reference id from their
// approval email AND a name/email that matches the listing that id resolves
// to. Before that check existed, this endpoint accepted any business name and
// would happily queue an edit to a listing the sender had nothing to do with.
//
// Every failure of that check answers with the same message, so the endpoint
// cannot be used to enumerate reference ids or fish for which listing owns one.

/** The uniform verification failure — never says which half failed. */
function verificationFailed() {
  return NextResponse.json(
    { error: VERIFICATION_FAILED_MESSAGE, errors: { reference_id: VERIFICATION_FAILED_MESSAGE } },
    { status: 400 },
  );
}

export async function POST(request) {
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Change requests are not configured yet.' }, { status: 503 });
  }

  const limited = enforceRateLimit('changeRequest', request);
  if (limited) return limited;

  // Multipart now that photos can travel with the request.
  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const result = validateChangeRequest({
    reference_id: form.get('reference_id'),
    identifier: form.get('identifier'),
    request_details: form.get('request_details'),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: Object.values(result.errors)[0], errors: result.errors },
      { status: 400 },
    );
  }

  // ---- optional photos (up to 5) -------------------------------------------
  // Same rules as the intake form: size, real content type sniffed from the
  // bytes, and generated filenames. Checked before the database lookup so a
  // bad upload costs nothing, and every file is validated before any of them
  // is uploaded — an invalid fifth file must not leave four orphans behind.
  const photos = form
    .getAll('photos')
    .filter((f) => f && typeof f === 'object' && typeof f.arrayBuffer === 'function' && f.size > 0);

  if (photos.length > LIMITS.changeRequestPhotoCount) {
    const message = `You can attach up to ${LIMITS.changeRequestPhotoCount} photos (you attached ${photos.length}).`;
    return NextResponse.json({ error: message, errors: { photos: message } }, { status: 400 });
  }

  const prepared = [];
  for (const [index, file] of photos.entries()) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const checked = validatePhoto(buffer, file.type || null);

    if (!checked.ok) {
      const message = photos.length > 1 ? `Photo ${index + 1}: ${checked.message}` : checked.message;
      return NextResponse.json({ error: message, errors: { photos: message } }, { status: 400 });
    }
    prepared.push({ buffer, checked });
  }

  const supabase = getAdminClient();

  // ---- verification --------------------------------------------------------
  const { data: business, error: lookupError } = await supabase
    .from('businesses')
    .select('id, name, contact_email')
    .eq('reference_id', result.referenceId)
    .maybeSingle();

  if (lookupError) {
    console.error('[change-requests] reference lookup failed', lookupError);
    return NextResponse.json({ error: 'Could not send your request. Please try again.' }, { status: 500 });
  }

  // No such reference id, or one that belongs to a different business than the
  // name/email given. Both must line up, so a reference id on its own — leaked,
  // guessed or forwarded — is not enough to edit someone's listing.
  if (!business || !identifierMatchesBusiness(result.value.identifier, business)) {
    return verificationFailed();
  }

  const requestId = randomUUID();

  const photoUrls = [];
  for (const { buffer, checked } of prepared) {
    // Filename generated server-side from a UUID; the uploaded name is
    // discarded, so nothing the user chose can shape the storage path.
    const objectPath = `change-requests/${business.id}/${randomUUID()}.${checked.extension}`;

    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(objectPath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: checked.type,
      });

    if (uploadError) {
      console.error('[change-requests] photo upload failed', uploadError);
      continue; // Non-fatal: the request itself still needs to reach us.
    }
    photoUrls.push(supabase.storage.from(PHOTO_BUCKET).getPublicUrl(objectPath).data.publicUrl);
  }

  const { error } = await supabase.from('change_requests').insert({
    id: requestId,
    ...result.value,
    business_id: business.id,
    photo_urls: photoUrls.length > 0 ? photoUrls : null,
  });

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
      // The verified listing, not the free text the sender typed.
      { name: 'Listing', value: `${business.name} (${result.referenceId})` },
      { name: 'Request details', value: preview },
      ...(photoUrls.length > 0
        ? [{ name: 'Photos', value: photoUrls.map((url, i) => `[${i + 1}](${url})`).join(' · ') }]
        : []),
    ],
  });

  return NextResponse.json({ ok: true });
}
