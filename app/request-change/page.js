'use client';

import { useState } from 'react';
import FormPage, { FormHeading, Submitted } from '@/components/FormPage';
import Button from '@/components/ui/Button';
import { Field, Textarea, TextInput } from '@/components/ui/Field';
import Toast, { useToast, useRapidClickGuard } from '@/components/ui/Toast';
import { LIMITS } from '@/lib/validation';
import styles from './page.module.css';

export default function RequestChangePage() {
  const [identifier, setIdentifier] = useState('');
  const [change, setChange] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [sent, setSent] = useState(false);
  const { toast, showTooFast } = useToast();
  const isRapidClicking = useRapidClickGuard();

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
    if (!identifier.trim()) next.identifier = 'Tell us which listing this is.';
    if (!change.trim()) next.change = 'Describe the change you want.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Server route validates, rate limits, inserts and notifies. The browser
      // no longer writes to the database directly.
      const res = await fetch('/api/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          request_details: change.trim(),
        }),
      });

      if (res.status === 429) {
        showTooFast();
        setSubmitting(false);
        return;
      }

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (payload.errors) {
          setErrors({
            identifier: payload.errors.identifier,
            change: payload.errors.request_details,
          });
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
