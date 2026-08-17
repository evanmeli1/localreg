'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IconCheck, IconLock } from '@tabler/icons-react';
import FormPage, { FormHeading, Submitted } from '@/components/FormPage';
import PhotoUploader, { usePhotoPicker } from '@/components/PhotoUploader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Field, Select, Textarea, TextInput } from '@/components/ui/Field';
import { CATEGORIES, subcategoriesFor, usesFreeTextSubcategory } from '@/lib/categories';
import { LIMITS } from '@/lib/validation';
import Toast, { useToast, useRapidClickGuard } from '@/components/ui/Toast';
import styles from '@/app/welcome/page.module.css';

const MAX_DESCRIPTION = LIMITS.description.max;

/** Server field names -> the form's own field names. */
const SERVER_FIELD_MAP = {
  name: 'name',
  category: 'categoryId',
  subcategory: 'subcategory',
  website: 'website',
  contact_email: 'email',
  description: 'description',
  photos: 'photos',
};

function mapServerErrors(serverErrors) {
  const mapped = {};
  for (const [field, message] of Object.entries(serverErrors)) {
    mapped[SERVER_FIELD_MAP[field] ?? field] = message;
  }
  return mapped;
}

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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submittedEmail, setSubmittedEmail] = useState(null);

  // The session_id in the URL is untrusted input. Until the server confirms it
  // is a real, paid, unused Checkout Session, no form is rendered.
  const [verifyState, setVerifyState] = useState(sessionId ? 'checking' : 'gate');
  const [customerId, setCustomerId] = useState(null);

  const { toast, showToast, showTooFast } = useToast();
  const isRapidClicking = useRapidClickGuard();

  // Shared picker — same control the change request form uses.
  const picker = usePhotoPicker({
    max: LIMITS.photoCount,
    onLimitExceeded: (message) => showToast(message, 'red'),
    onAdd: () => setErrors((prev) => ({ ...prev, photos: undefined })),
  });
  const photos = picker.photos;

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    fetch('/api/checkout/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.status === 'ok') {
          setCustomerId(body.customerId);
          setVerifyState('ok');
        } else if (body.status === 'already_submitted') {
          setVerifyState('already');
        } else if (body.status === 'unavailable') {
          setVerifyState('unavailable');
        } else {
          // invalid or unpaid — both mean "no completed payment here".
          setVerifyState('gate');
        }
      })
      .catch((err) => {
        console.error('[welcome] session verification failed', err);
        if (!cancelled) setVerifyState('unavailable');
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  function setValue(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  function handleCategoryChange(nextId) {
    // Subcategory options depend on the category, so any stale pick is dropped.
    setValues((prev) => ({ ...prev, categoryId: nextId, subcategory: '' }));
    setErrors((prev) => ({ ...prev, categoryId: undefined, subcategory: undefined }));
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
    // Mirrors lib/validation.js so the user gets the same answer before a
    // round trip. The server remains the authority.
    const description = values.description.trim();
    if (!description) next.description = 'Add a short description.';
    else if (description.length < LIMITS.description.min) {
      next.description = `Description must be at least ${LIMITS.description.min} characters.`;
    }
    if (values.name.trim() && values.name.trim().length < LIMITS.name.min) {
      next.name = `Business name must be at least ${LIMITS.name.min} characters.`;
    }
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    // Guard against double-submission from a double-click as its own bug
    // class, independent of the server's rate limiter.
    if (submitting) return;
    if (isRapidClicking()) {
      showTooFast();
      return;
    }

    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Multipart so the photo travels with the fields; the server validates
      // both, uploads under a generated filename, and does the insert. Nothing
      // is written straight from the browser any more.
      const body = new FormData();
      body.set('session_id', sessionId);
      body.set('name', values.name.trim());
      body.set('category', values.categoryId);
      body.set('subcategory', values.subcategory);
      body.set('website', values.website.trim());
      body.set('contact_email', values.email.trim());
      body.set('description', values.description.trim());
      photos.forEach((p) => body.append('photos', p.file, p.file.name));

      const res = await fetch('/api/submissions', { method: 'POST', body });
      const payload = await res.json().catch(() => ({}));

      if (res.status === 429) {
        showTooFast();
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        // Surface the server's per-field messages on the fields themselves so
        // the user can see which input to fix.
        if (payload.errors) {
          setErrors(mapServerErrors(payload.errors));
        }
        setSubmitError(payload.error || 'Could not submit your listing. Please try again.');
        setSubmitting(false);
        return;
      }

      setSubmittedEmail(values.email.trim());
    } catch (err) {
      console.error('[welcome] submission failed', err);
      setSubmitError('Could not reach the server. Please try again.');
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

  if (verifyState === 'checking') {
    return (
      <FormPage>
        <div className={styles.gate}>
          <p className={styles.gateText}>Checking your payment…</p>
        </div>
      </FormPage>
    );
  }

  // Missing, fabricated, unknown or unpaid session — all land here, and
  // deliberately give the same message so the page can't be used to probe
  // which session ids exist.
  if (verifyState === 'gate') {
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
            This form opens automatically once your subscription is set up. Start
            from &ldquo;List your business&rdquo; and we&apos;ll bring you back
            here as soon as payment goes through.
          </p>
          <Button href="/" variant="quiet" className={styles.gateCta}>
            Back to directory
          </Button>
        </div>
      </FormPage>
    );
  }

  if (verifyState === 'already') {
    return (
      <FormPage>
        <div className={styles.gate}>
          <span className={styles.gateIcon}>
            <IconCheck size={20} stroke={2.5} />
          </span>
          <h1 className={styles.gateHeading}>You&apos;ve already submitted</h1>
          <p className={styles.gateText}>
            We have your listing for this payment and it&apos;s in the review
            queue. You&apos;ll get an email once it&apos;s approved and live.
          </p>
          <Button href="/" variant="quiet" className={styles.gateCta}>
            Back to directory
          </Button>
        </div>
      </FormPage>
    );
  }

  if (verifyState === 'unavailable') {
    return (
      <FormPage>
        <div className={styles.gate}>
          <span className={styles.gateIcon}>
            <IconLock size={20} stroke={1.75} />
          </span>
          <h1 className={styles.gateHeading}>We couldn&apos;t check your payment</h1>
          <p className={styles.gateText}>
            Something went wrong on our end — your payment is safe. Please
            refresh in a moment, and email us if it keeps happening.
          </p>
          <Button href="/" variant="quiet" className={styles.gateCta}>
            Back to directory
          </Button>
        </div>
      </FormPage>
    );
  }

  const subcategories = subcategoriesFor(values.categoryId);
  const freeTextSubcategory = usesFreeTextSubcategory(values.categoryId);

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

        {freeTextSubcategory ? (
          // "Other" has no fixed list, so the business describes itself.
          <Field
            label="Describe your category"
            htmlFor="subcategory"
            error={errors.subcategory}
            helper="e.g. Pet grooming, Event planning"
            counter={`${values.subcategory.length}/${LIMITS.freeTextSubcategory.max}`}
          >
            <TextInput
              id="subcategory"
              name="subcategory"
              value={values.subcategory}
              maxLength={LIMITS.freeTextSubcategory.max}
              invalid={Boolean(errors.subcategory)}
              onChange={(e) => setValue('subcategory', e.target.value)}
              placeholder="Pet grooming"
            />
          </Field>
        ) : (
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
        )}

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

        <Field
          label="Photos"
          htmlFor="photos"
          optional
          error={errors.photos}
          counter={photos.length > 0 ? `${photos.length}/${LIMITS.photoCount}` : undefined}
        >
          <PhotoUploader
            picker={picker}
            showCover
            emptyHint={`Up to ${LIMITS.photoCount}. No photo? We'll use a placeholder.`}
          />
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

      <Toast toast={toast} />
    </FormPage>
  );
}
