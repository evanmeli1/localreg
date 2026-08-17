'use client';

import { useState } from 'react';
import FormPage, { FormHeading, Submitted } from '@/components/FormPage';
import Button from '@/components/ui/Button';
import { Field, Textarea, TextInput } from '@/components/ui/Field';
import { supabase, isSupabaseConfigured, describeError } from '@/lib/supabase';
import styles from './page.module.css';

export default function RequestChangePage() {
  const [identifier, setIdentifier] = useState('');
  const [change, setChange] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const next = {};
    if (!identifier.trim()) next.identifier = 'Tell us which listing this is.';
    if (!change.trim()) next.change = 'Describe the change you want.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (!isSupabaseConfigured) {
      setSubmitError('The database is not configured yet. Please try again later.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // change_requests is insert-only for anon under RLS — nothing is read back.
    const { error } = await supabase.from('change_requests').insert({
      identifier: identifier.trim(),
      request_details: change.trim(),
    });

    if (error) {
      setSubmitError(describeError(error, 'Could not send your request. Please try again.'));
      setSubmitting(false);
      return;
    }

    setSent(true);
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
        >
          <Textarea
            id="change"
            name="change"
            rows={4}
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
    </FormPage>
  );
}
