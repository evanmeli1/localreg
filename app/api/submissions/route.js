import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { getAdminClient, isAdminConfigured } from '@/lib/supabase-admin';
import { getCategory } from '@/lib/categories';
import { COLORS, DISCORD_WEBHOOKS, notifyDiscord } from '@/lib/discord';
import { enforceRateLimit } from '@/lib/rate-limit';
import { LIMITS, validatePhoto, validateSubmission } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const PHOTO_BUCKET = 'business-photos';

// The intake form's write path. This used to be a direct insert from the
// browser with the anon key, which meant no server-side validation, no rate
// limiting, and no way to inspect an upload before it reached Storage. Every
// field limit, the payment re-check, and the file sniffing below only work
// because the write happens here.

export async function POST(request) {
  if (!isAdminConfigured || !isStripeConfigured) {
    return NextResponse.json({ error: 'Submissions are not configured yet.' }, { status: 503 });
  }

  const limited = enforceRateLimit('submission', request);
  if (limited) return limited;

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const sessionId = form.get('session_id');
  if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
    return NextResponse.json({ error: 'A valid payment session is required.' }, { status: 400 });
  }

  const result = validateSubmission({
    name: form.get('name'),
    category: form.get('category'),
    subcategory: form.get('subcategory'),
    website: form.get('website'),
    contact_email: form.get('contact_email'),
    description: form.get('description'),
  });

  if (!result.ok) {
    // Per-field messages so the form can highlight the offending input rather
    // than showing a generic failure.
    return NextResponse.json(
      { error: Object.values(result.errors)[0], errors: result.errors },
      { status: 400 },
    );
  }

  // ---- optional photos (up to 10) -----------------------------------------
  // Also before the Stripe call: request.formData() has already read these
  // bytes into memory, so inspecting them here is free, and it means a bad
  // upload is rejected without spending a network round trip.
  const photos = form
    .getAll('photos')
    .filter((f) => f && typeof f === 'object' && typeof f.arrayBuffer === 'function' && f.size > 0);

  if (photos.length > LIMITS.photoCount) {
    const message = `You can upload up to ${LIMITS.photoCount} photos (you attached ${photos.length}).`;
    return NextResponse.json({ error: message, errors: { photos: message } }, { status: 400 });
  }

  // Validate every file BEFORE uploading any of them, so an invalid tenth file
  // doesn't leave nine orphans in Storage.
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

  // Payment is re-verified here, not just on page load: this route creates the
  // row, so it cannot rely on the client having passed the earlier check.
  // Deliberately after field validation — that is local and free, while this is
  // a network round trip we should not spend on input we already know is bad.
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    if (error?.code !== 'resource_missing') console.error('[submissions] Stripe lookup failed:', error);
    return NextResponse.json({ error: 'We could not verify your payment.' }, { status: 402 });
  }

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'We could not verify your payment.' }, { status: 402 });
  }

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  if (!customerId) {
    return NextResponse.json({ error: 'We could not verify your payment.' }, { status: 402 });
  }

  const supabase = getAdminClient();

  // One payment, one listing. The UNIQUE constraint is the real guard; this
  // returns the friendly message before doing any upload work.
  const { data: existing } = await supabase
    .from('businesses')
    .select('id')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You've already submitted for this payment." }, { status: 409 });
  }

  const photoUrls = [];
  for (const { buffer, checked } of prepared) {
    // Filename is generated server-side from a UUID. The user's original name
    // is discarded entirely, so "../../secret.png" or odd unicode can never
    // reach the storage path.
    const objectPath = `${sessionId}/${randomUUID()}.${checked.extension}`;

    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(objectPath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: checked.type,
      });

    if (uploadError) {
      console.error('[submissions] photo upload failed', uploadError);
      continue; // Non-fatal: the listing is worth more than one picture.
    }
    photoUrls.push(supabase.storage.from(PHOTO_BUCKET).getPublicUrl(objectPath).data.publicUrl);
  }

  // photo_url stays populated with the first image so existing readers keep
  // working; photo_urls carries the full ordered set.
  const photoUrl = photoUrls[0] ?? null;

  // ---- insert -------------------------------------------------------------
  const businessId = randomUUID();
  const { error: insertError } = await supabase.from('businesses').insert({
    id: businessId,
    ...result.value,
    photo_url: photoUrl,
    photo_urls: photoUrls.length > 0 ? photoUrls : null,
    stripe_session_id: sessionId,
    stripe_customer_id: customerId,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: "You've already submitted for this payment." }, { status: 409 });
    }
    // 23514 = a CHECK constraint caught something validation missed.
    if (insertError.code === '23514') {
      console.error('[submissions] DB constraint rejected a row that passed validation', insertError);
      return NextResponse.json({ error: 'Some of those details are not valid.' }, { status: 400 });
    }
    console.error('[submissions] insert failed', insertError);
    return NextResponse.json({ error: 'Could not submit your listing. Please try again.' }, { status: 500 });
  }

  await supabase.from('events').insert({
    event_type: 'submission_created',
    business_id: businessId,
    stripe_customer_id: customerId,
  });

  const category = getCategory(result.value.category);
  await notifyDiscord(DISCORD_WEBHOOKS.signups, {
    title: '📋 New submission pending approval',
    color: COLORS.gray,
    fields: [
      { name: 'Business name', value: result.value.name },
      {
        name: 'Category / Subcategory',
        value: `${category ? category.label : result.value.category} / ${result.value.subcategory}`,
      },
      { name: 'Contact email', value: result.value.contact_email },
    ],
  });

  return NextResponse.json({ ok: true, id: businessId });
}
