'use client';

import { useState } from 'react';
import FormPage, { FormHeading, Submitted } from '@/components/FormPage';
import Button from '@/components/ui/Button';
import { Field, Textarea, TextInput } from '@/components/ui/Field';
import styles from './page.module.css';

export default function RequestChangePage() {
  const [identifier, setIdentifier] = useState('');
  const [change, setChange] = useState('');
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();

    const next = {};
    if (!identifier.trim()) next.identifier = 'Tell us which listing this is.';
    if (!change.trim()) next.change = 'Describe the change you want.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // No API yet — same client-side confirmation pattern as the intake form.
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

        <Button type="submit" size="lg" fullWidth className={styles.submit}>
          Send request
        </Button>
      </form>
    </FormPage>
  );
}
