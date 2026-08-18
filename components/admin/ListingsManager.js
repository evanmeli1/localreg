'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Toast, { useToast } from '@/components/ui/Toast';
import { Field, TextInput, Textarea, Select } from '@/components/ui/Field';
import PhotoUploader, { usePhotoPicker } from '@/components/PhotoUploader';
import { CATEGORIES, getCategory, subcategoriesFor, usesFreeTextSubcategory } from '@/lib/categories';
import { LIMITS } from '@/lib/validation';
import styles from './ListingsManager.module.css';

/**
 * Live listings with an inline edit form.
 *
 * The form submits to /api/admin/businesses/update, which runs the same
 * validation as the public intake route. The limits shown here (counters,
 * maxLength) are a convenience only — the server is what actually decides.
 */
export default function ListingsManager({ onSaved }) {
  const router = useRouter();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const { toast, showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/businesses', { cache: 'no-store' });
      if (res.status === 401) {
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setLoadError(body.error || 'Could not load listings.');
      else setListings(body.listings ?? []);
    } catch (err) {
      console.error('[admin] listings fetch failed', err);
      setLoadError('Could not reach the server.');
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSaved(updated) {
    setListings((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
    setEditingId(null);
    showToast(`Saved ${updated.name}`, 'green');
    onSaved?.();
  }

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.heading}>Live listings</h2>
        {!loading && !loadError && <Badge variant="count">{listings.length}</Badge>}
      </div>

      {loading ? (
        <p className={styles.empty}>Loading listings…</p>
      ) : loadError ? (
        <div className={styles.errorBox}>
          <p className={styles.errorTitle}>Couldn&apos;t load listings</p>
          <p className={styles.errorText}>{loadError}</p>
          <Button variant="quiet" onClick={load}>
            Try again
          </Button>
        </div>
      ) : listings.length === 0 ? (
        <p className={styles.empty}>No live listings yet.</p>
      ) : (
        <div className={styles.list}>
          {listings.map((listing) =>
            editingId === listing.id ? (
              <EditForm
                key={listing.id}
                listing={listing}
                onCancel={() => setEditingId(null)}
                onSaved={handleSaved}
                onUnauthorised={() => router.refresh()}
              />
            ) : (
              <ListingRow
                key={listing.id}
                listing={listing}
                onEdit={() => setEditingId(listing.id)}
              />
            ),
          )}
        </div>
      )}

      <Toast toast={toast} />
    </section>
  );
}

function ListingRow({ listing, onEdit }) {
  const category = getCategory(listing.category);
  const photos = listing.photo_urls ?? (listing.photo_url ? [listing.photo_url] : []);

  return (
    <article className={styles.row}>
      <div className={styles.rowMain}>
        <div className={styles.rowHead}>
          <span className={styles.name}>{listing.name}</span>
          <span className={styles.meta}>
            {category ? category.label : listing.category} · {listing.subcategory}
            {listing.reference_id ? ` · ${listing.reference_id}` : ''}
          </span>
        </div>
        <p className={styles.description}>{listing.description}</p>
        {photos.length > 0 && (
          <span className={styles.photoCount}>
            {photos.length} photo{photos.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <div className={styles.rowActions}>
        <Button variant="quiet" onClick={onEdit}>
          Edit
        </Button>
      </div>
    </article>
  );
}

/**
 * Same field set as the intake form, minus contact email (which the admin has
 * no business rewriting) and minus anything about payment or status.
 */
function EditForm({ listing, onCancel, onSaved, onUnauthorised }) {
  const [name, setName] = useState(listing.name ?? '');
  const [category, setCategory] = useState(listing.category ?? '');
  const [subcategory, setSubcategory] = useState(listing.subcategory ?? '');
  const [website, setWebsite] = useState(listing.website ?? '');
  const [description, setDescription] = useState(listing.description ?? '');
  const [keptPhotos, setKeptPhotos] = useState(
    listing.photo_urls ?? (listing.photo_url ? [listing.photo_url] : []),
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);

  const freeText = usesFreeTextSubcategory(category);
  const options = subcategoriesFor(category);

  // Room left for new uploads, so the picker cannot queue more than the server
  // will accept once the kept ones are counted.
  const remaining = Math.max(0, LIMITS.photoCount - keptPhotos.length);
  const picker = usePhotoPicker({ max: remaining });

  function changeCategory(next) {
    setCategory(next);
    // A subcategory only means something inside its own category, so switching
    // clears it rather than carrying an invalid pair into the request.
    setSubcategory('');
  }

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    setFormError(null);

    const form = new FormData();
    form.set('id', listing.id);
    form.set('name', name);
    form.set('category', category);
    form.set('subcategory', subcategory);
    form.set('website', website);
    form.set('description', description);
    for (const url of keptPhotos) form.append('keep_photos', url);
    // picker.photos holds { id, file, url } previews; only the File goes up.
    for (const photo of picker.photos) form.append('photos', photo.file);

    try {
      const res = await fetch('/api/admin/businesses/update', { method: 'POST', body: form });

      if (res.status === 401) {
        onUnauthorised();
        return;
      }

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrors(body.errors ?? {});
        setFormError(body.error || 'Could not save that edit.');
        setSaving(false);
        return;
      }

      onSaved(body.listing);
    } catch (err) {
      console.error('[admin] edit failed', err);
      setFormError('Could not reach the server. Please try again.');
      setSaving(false);
    }
  }

  return (
    <form className={styles.editCard} onSubmit={submit}>
      <div className={styles.editHead}>
        <h3 className={styles.editTitle}>Editing {listing.name}</h3>
        {listing.reference_id && <span className={styles.ref}>{listing.reference_id}</span>}
      </div>

      <Field label="Business name" htmlFor={`name-${listing.id}`} error={errors.name}
        counter={`${name.length}/${LIMITS.name.max}`}>
        <TextInput
          id={`name-${listing.id}`}
          value={name}
          maxLength={LIMITS.name.max}
          invalid={!!errors.name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <div className={styles.pair}>
        <Field label="Category" htmlFor={`cat-${listing.id}`} error={errors.category}>
          <Select
            id={`cat-${listing.id}`}
            value={category}
            invalid={!!errors.category}
            onChange={(e) => changeCategory(e.target.value)}
          >
            <option value="">Choose…</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={freeText ? 'Describe the category' : 'Subcategory'}
          htmlFor={`sub-${listing.id}`}
          error={errors.subcategory}
          counter={freeText ? `${subcategory.length}/${LIMITS.freeTextSubcategory.max}` : undefined}
        >
          {freeText ? (
            <TextInput
              id={`sub-${listing.id}`}
              value={subcategory}
              maxLength={LIMITS.freeTextSubcategory.max}
              invalid={!!errors.subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
            />
          ) : (
            <Select
              id={`sub-${listing.id}`}
              value={subcategory}
              invalid={!!errors.subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              disabled={!category}
            >
              <option value="">Choose…</option>
              {options.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Field label="Website" htmlFor={`web-${listing.id}`} error={errors.website} optional>
        <TextInput
          id={`web-${listing.id}`}
          value={website}
          invalid={!!errors.website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </Field>

      <Field
        label="Description"
        htmlFor={`desc-${listing.id}`}
        error={errors.description}
        counter={`${description.length}/${LIMITS.description.max}`}
      >
        <Textarea
          id={`desc-${listing.id}`}
          value={description}
          rows={3}
          invalid={!!errors.description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      {keptPhotos.length > 0 && (
        <div className={styles.photoBlock}>
          <span className={styles.photoLabel}>Current photos</span>
          <div className={styles.photoGrid}>
            {keptPhotos.map((url) => (
              <div key={url} className={styles.photoItem}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className={styles.photoThumb} />
                <button
                  type="button"
                  className={styles.removePhoto}
                  onClick={() => setKeptPhotos((prev) => prev.filter((u) => u !== url))}
                  aria-label="Remove this photo"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <p className={styles.photoNote}>
            Removing unlinks the photo from the listing. The file itself is kept.
          </p>
        </div>
      )}

      {remaining > 0 && (
        <div className={styles.photoBlock}>
          <span className={styles.photoLabel}>Add photos ({remaining} slot{remaining === 1 ? '' : 's'} left)</span>
          <PhotoUploader picker={picker} id={`photos-${listing.id}`} />
          {errors.photos && (
            <p className={styles.photoError} role="alert">
              {errors.photos}
            </p>
          )}
        </div>
      )}

      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}

      <div className={styles.editActions}>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="quiet" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
