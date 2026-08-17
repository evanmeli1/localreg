'use client';

import { useEffect, useRef, useState } from 'react';
import { IconCheck, IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import FormPage, { FormHeading, Submitted } from '@/components/FormPage';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Field, Select, Textarea, TextInput } from '@/components/ui/Field';
import { CATEGORIES, subcategoriesFor } from '@/lib/categories';
import styles from './page.module.css';

const MAX_DESCRIPTION = 160;

const EMPTY = {
  name: '',
  categoryId: '',
  subcategory: '',
  website: '',
  email: '',
  description: '',
};

export default function WelcomePage() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [photo, setPhoto] = useState(null); // { file, url }
  const [dragging, setDragging] = useState(false);
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
    // Nothing is uploaded — the preview is a local object URL.
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

  function handleSubmit(event) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // No API yet — the submission lives and dies in component state.
    setSubmittedEmail(values.email.trim());
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

        <Button type="submit" size="lg" fullWidth className={styles.submit}>
          Submit for review
        </Button>

        <p className={styles.footnote}>
          You&apos;ll get an email once it&apos;s approved and live.
        </p>
      </form>
    </FormPage>
  );
}
