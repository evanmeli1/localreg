'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IconCheck, IconLock, IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import FormPage, { FormHeading, Submitted } from '@/components/FormPage';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Field, Select, Textarea, TextInput } from '@/components/ui/Field';
import { CATEGORIES, subcategoriesFor } from '@/lib/categories';
import { supabase, isSupabaseConfigured, describeError } from '@/lib/supabase';
import styles from '@/app/welcome/page.module.css';

const MAX_DESCRIPTION = 160;
const PHOTO_BUCKET = 'business-photos';

const EMPTY = {
  name: '',
  categoryId: '',
  subcategory: '',
  website: '',
  email: '',
  description: '',
};

export default function WelcomeForm() {
  // Stripe Checkout will redirect here with ?session_id=cs_live_… once that
  // phase lands. Until then it has to be supplied by hand for testing.
  const sessionId = useSearchParams().get('session_id');

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [photo, setPhoto] = useState(null); // { file, url }
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submittedEmail, setSubmittedEmail] = useState(null);

  const fileInputRef = useRef(null);
  // Mirror of the live preview URL. Kept in a ref (written only from handlers)
  // so unmount can revoke it — a [photo]-keyed effect would revoke too early
  // under StrictMode's double-invoked effects and blank the preview.
  const photoUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    };
  }, []);

  function setValue(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  function handleCategoryChange(nextId) {
    // Subcategory options depend on the category, so any stale pick is dropped.
    setValues((prev) => ({ ...prev, categoryId: nextId, subcategory: '' }));
    setErrors((prev) => ({ ...prev, categoryId: undefined, subcategory: undefined }));
  }

  function selectFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    const url = URL.createObjectURL(file);
    photoUrlRef.current = url;
    setPhoto({ file, url });
  }

  function clearPhoto() {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = null;
    setPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function validate() {
    const next = {};
    if (!values.name.trim()) next.name = 'Business name is required.';
    if (!values.categoryId) next.categoryId = 'Pick a category.';
    if (!values.subcategory) next.subcategory = 'Pick a subcategory.';
    if (!values.website.trim()) next.website = 'Website is required.';
    if (!values.email.trim()) {
      next.email = 'Contact email is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    if (!values.description.trim()) next.description = 'Add a short description.';
    return next;
  }

  /** Uploads to the public bucket and returns its public URL, or null. */
  async function uploadPhoto() {
    const safeName = photo.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${sessionId}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, photo.file, { cacheControl: '3600', upsert: false });

    if (error) {
      console.error('[welcome] photo upload failed', error);
      return null; // Non-fatal: the listing still submits, minus the photo.
    }

    return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (!isSupabaseConfigured) {
      setSubmitError('The database is not configured yet. Please try again later.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const photoUrl = photo ? await uploadPhoto() : null;

      // The id is generated here rather than read back from the insert: the
      // SELECT policy only exposes 'live' rows, so a RETURNING clause on a
      // fresh 'pending' row would be blocked by RLS.
      const businessId = crypto.randomUUID();

      const { error } = await supabase.from('businesses').insert({
        id: businessId,
        name: values.name.trim(),
        category: values.categoryId,
        subcategory: values.subcategory,
        website: values.website.trim(),
        contact_email: values.email.trim(),
        description: values.description.trim(),
        photo_url: photoUrl,
        stripe_session_id: sessionId,
        // Checkout will supply the real customer id. Deriving it from the
        // session keeps the NOT NULL + UNIQUE constraint meaningful in the
        // meantime, and keeps one payment tied to one listing.
        stripe_customer_id: `pending_${sessionId}`,
      });

      if (error) {
        // 23505 = unique_violation on stripe_session_id / stripe_customer_id.
        if (error.code === '23505') {
          setSubmitError("You've already submitted for this payment.");
        } else {
          setSubmitError(describeError(error, 'Could not submit your listing. Please try again.'));
        }
        setSubmitting(false);
        return;
      }

      // Audit log. `events` is service-role only under RLS, so it goes through
      // a server route rather than the anon client. A failure here must not
      // cost the user their submission, so it is logged and swallowed.
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'submission_created',
          business_id: businessId,
        }),
      }).catch((err) => console.error('[welcome] event log failed', err));

      setSubmittedEmail(values.email.trim());
    } catch (err) {
      setSubmitError(describeError(err, 'Could not submit your listing. Please try again.'));
      setSubmitting(false);
    }
  }

  if (submittedEmail) {
    return (
      <FormPage>
        <Submitted title="You're all set">
          We&apos;re reviewing your listing — you&apos;ll get an email at{' '}
          <strong>{submittedEmail}</strong> once it&apos;s approved.
        </Submitted>
      </FormPage>
    );
  }

  // No session_id means they reached this page without going through payment.
  if (!sessionId) {
    return (
      <FormPage>
        <div className={styles.gate}>
          <span className={styles.gateIcon}>
            <IconLock size={20} stroke={1.75} />
          </span>
          <h1 className={styles.gateHeading}>
            It looks like you haven&apos;t completed payment yet
          </h1>
          <p className={styles.gateText}>
            This form opens automatically once your subscription is set up. In a
            later phase this page will link straight to Stripe Checkout — until
            then there&apos;s nothing to submit against.
          </p>
          <Button href="/" variant="quiet" className={styles.gateCta}>
            Back to directory
          </Button>
        </div>
      </FormPage>
    );
  }

  const subcategories = subcategoriesFor(values.categoryId);

  return (
    <FormPage>
      <FormHeading
        title="Tell us about your business"
        subtitle="Takes about a minute. We review before it goes live."
      >
        <Badge variant="greenSoft" className={styles.paidBadge}>
          <IconCheck size={12} stroke={3} />
          Payment received
        </Badge>
      </FormHeading>

      <form onSubmit={handleSubmit} noValidate>
        <Field label="Business name" htmlFor="name" error={errors.name}>
          <TextInput
            id="name"
            name="name"
            value={values.name}
            invalid={Boolean(errors.name)}
            onChange={(e) => setValue('name', e.target.value)}
            placeholder="Nook & Cranny Coffee"
          />
        </Field>

        <Field label="Category" htmlFor="category" error={errors.categoryId}>
          <Select
            id="category"
            name="category"
            value={values.categoryId}
            invalid={Boolean(errors.categoryId)}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <option value="">Choose a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Subcategory"
          htmlFor="subcategory"
          error={errors.subcategory}
          helper={!values.categoryId ? 'Pick a category first.' : undefined}
        >
          <Select
            id="subcategory"
            name="subcategory"
            value={values.subcategory}
            disabled={!values.categoryId}
            invalid={Boolean(errors.subcategory)}
            onChange={(e) => setValue('subcategory', e.target.value)}
          >
            <option value="">Choose a subcategory</option>
            {subcategories.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Website" htmlFor="website" error={errors.website}>
          <TextInput
            id="website"
            name="website"
            value={values.website}
            invalid={Boolean(errors.website)}
            onChange={(e) => setValue('website', e.target.value)}
            placeholder="yourbusiness.com"
          />
        </Field>

        <Field
          label="Contact email"
          htmlFor="email"
          error={errors.email}
          helper="Used for approval and listing updates"
        >
          <TextInput
            id="email"
            name="email"
            type="email"
            value={values.email}
            invalid={Boolean(errors.email)}
            onChange={(e) => setValue('email', e.target.value)}
            placeholder="you@yourbusiness.com"
          />
        </Field>

        <Field
          label="Short description"
          htmlFor="description"
          error={errors.description}
          counter={`${values.description.length}/${MAX_DESCRIPTION}`}
        >
          <Textarea
            id="description"
            name="description"
            rows={3}
            maxLength={MAX_DESCRIPTION}
            value={values.description}
            invalid={Boolean(errors.description)}
            onChange={(e) => setValue('description', e.target.value)}
            placeholder="What you do, in a sentence or two."
          />
        </Field>

        <Field label="Photo" htmlFor="photo" optional>
          <input
            ref={fileInputRef}
            id="photo"
            name="photo"
            type="file"
            accept="image/*"
            className={styles.fileInput}
            onChange={(e) => selectFile(e.target.files?.[0])}
          />

          {photo ? (
            <div className={styles.preview}>
              {/* Local object URL, never uploaded — next/image would be overkill. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className={styles.thumb} />
              <div className={styles.previewMeta}>
                <span className={styles.previewName}>{photo.file.name}</span>
                <span className={styles.previewHint}>
                  <IconPhoto size={12} stroke={1.75} />
                  Ready to upload
                </span>
              </div>
              <button
                type="button"
                className={styles.previewClear}
                onClick={clearPhoto}
                aria-label="Remove photo"
              >
                <IconX size={15} stroke={2} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                selectFile(e.dataTransfer.files?.[0]);
              }}
            >
              <IconUpload size={20} stroke={1.75} className={styles.dropIcon} />
              <span className={styles.dropText}>
                Drag a photo here, or tap to browse
              </span>
              <span className={styles.dropHint}>
                No photo? We&apos;ll use a placeholder for now.
              </span>
            </button>
          )}
        </Field>

        {submitError && <p className={styles.submitError}>{submitError}</p>}

        <Button
          type="submit"
          size="lg"
          fullWidth
          className={styles.submit}
          disabled={submitting}
        >
          {submitting ? 'Submitting…' : 'Submit for review'}
        </Button>

        <p className={styles.footnote}>
          You&apos;ll get an email once it&apos;s approved and live.
        </p>
      </form>
    </FormPage>
  );
}
