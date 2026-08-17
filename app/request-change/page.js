'use client';

import { useState } from 'react';
import FormPage, { FormHeading, Submitted } from '@/components/FormPage';
import PhotoUploader, { usePhotoPicker } from '@/components/PhotoUploader';
import Button from '@/components/ui/Button';
import { Field, Textarea, TextInput } from '@/components/ui/Field';
import Toast, { useToast, useRapidClickGuard } from '@/components/ui/Toast';
import { LIMITS } from '@/lib/validation';
import { normaliseReferenceId } from '@/lib/reference-id';
import styles from './page.module.css';

/** Server field names -> this form's own field names. */
const SERVER_FIELD_MAP = {
  reference_id: 'referenceId',
  identifier: 'identifier',
  request_details: 'change',
  photos: 'photos',
};

export default function RequestChangePage() {
  const [referenceId, setReferenceId] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [change, setChange] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [sent, setSent] = useState(false);
  const { toast, showToast, showTooFast } = useToast();
  const isRapidClicking = useRapidClickGuard();

  // Same control as the intake form, with the lower cap change requests use.
  const picker = usePhotoPicker({
    max: LIMITS.changeRequestPhotoCount,
    onLimitExceeded: (message) => showToast(message, 'red'),
    onAdd: () => setErrors((prev) => ({ ...prev, photos: undefined })),
  });

  async function handleSubmit(event) {
    event.preventDefault();
    // Disabling on first click stops double-submission independently of the
    // server's rate limiter.
    if (submitting) return;
    if (isRapidClicking()) {
      showTooFast();
      return;
    }

    const next = {};
    if (!referenceId.trim()) next.referenceId = 'Enter the reference ID from your approval email.';
    if (!identifier.trim()) next.identifier = 'Tell us which listing this is.';
    if (!change.trim()) next.change = 'Describe the change you want.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Multipart so the photos travel with the fields. The server verifies the
      // reference ID against the listing, validates and stores everything.
      const body = new FormData();
      body.set('reference_id', normaliseReferenceId(referenceId));
      body.set('identifier', identifier.trim());
      body.set('request_details', change.trim());
      picker.photos.forEach((p) => body.append('photos', p.file, p.file.name));

      const res = await fetch('/api/change-requests', { method: 'POST', body });

      if (res.status === 429) {
        showTooFast();
        setSubmitting(false);
        return;
      }

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (payload.errors) {
          const mapped = {};
          for (const [field, message] of Object.entries(payload.errors)) {
            mapped[SERVER_FIELD_MAP[field] ?? field] = message;
          }
          setErrors(mapped);
        }
        setSubmitError(payload.error || 'Could not send your request. Please try again.');
        setSubmitting(false);
        return;
      }

      setSent(true);
    } catch (err) {
      console.error('[request-change] submission failed', err);
      setSubmitError('Could not reach the server. Please try again.');
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <FormPage>
        <Submitted title="Request sent">
          Got it — we&apos;ll make the update and follow up if we have questions.
        </Submitted>
      </FormPage>
    );
  }

  return (
    <FormPage>
      <FormHeading
        title="Request a change to your listing"
        subtitle="Send us the edit and we'll take care of it."
      />

      <form onSubmit={handleSubmit} noValidate>
        <Field
          label="Reference ID"
          htmlFor="referenceId"
          error={errors.referenceId}
          helper="Sent to you by email when your listing was approved"
        >
          <TextInput
            id="referenceId"
            name="referenceId"
            value={referenceId}
            invalid={Boolean(errors.referenceId)}
            // Typed in any case, stored and sent uppercase.
            onChange={(e) => {
              setReferenceId(normaliseReferenceId(e.target.value));
              setErrors((prev) => ({ ...prev, referenceId: undefined }));
            }}
            placeholder="LR-4X9K2"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>

        <Field
          label="Business name or email"
          htmlFor="identifier"
          error={errors.identifier}
          helper="So we know which listing this is"
        >
          <TextInput
            id="identifier"
            name="identifier"
            value={identifier}
            invalid={Boolean(errors.identifier)}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setErrors((prev) => ({ ...prev, identifier: undefined }));
            }}
            placeholder="Nook & Cranny Coffee"
          />
        </Field>

        <Field
          label="What would you like changed?"
          htmlFor="change"
          error={errors.change}
          counter={`${change.length}/${LIMITS.requestDetails.max}`}
        >
          <Textarea
            id="change"
            name="change"
            rows={4}
            maxLength={LIMITS.requestDetails.max}
            value={change}
            invalid={Boolean(errors.change)}
            onChange={(e) => {
              setChange(e.target.value);
              setErrors((prev) => ({ ...prev, change: undefined }));
            }}
            placeholder="e.g. update our phone number, change our description, swap our photo"
          />
        </Field>

        <Field
          label="Photos"
          htmlFor="photos"
          optional
          error={errors.photos}
          counter={
            picker.photos.length > 0
              ? `${picker.photos.length}/${LIMITS.changeRequestPhotoCount}`
              : undefined
          }
        >
          <PhotoUploader
            picker={picker}
            emptyHint={`Up to ${LIMITS.changeRequestPhotoCount}. Only if the change involves new pictures.`}
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
          {submitting ? 'Sending…' : 'Send request'}
        </Button>
      </form>

      <Toast toast={toast} />
    </FormPage>
  );
}
