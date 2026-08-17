'use client';

import { useEffect, useRef, useState } from 'react';
import { IconUpload, IconX } from '@tabler/icons-react';
import styles from './PhotoUploader.module.css';

// The drag-and-drop photo picker, extracted from the intake form so
// /request-change gets the same control rather than a second copy of it.
// Nothing is uploaded from here — the files ride along with the form's own
// submit, and the server validates and stores them.

/**
 * Owns the selected files and their preview object URLs.
 *
 * @param {{max: number, onLimitExceeded?: (message: string) => void,
 *          onAdd?: () => void}} options
 */
export function usePhotoPicker({ max, onLimitExceeded, onAdd }) {
  const [photos, setPhotos] = useState([]); // [{ id, file, url }]
  const inputRef = useRef(null);

  // Mirror of the live preview URLs. Kept in a ref (written only from handlers)
  // so unmount can revoke them — a [photos]-keyed effect would revoke too early
  // under StrictMode's double-invoked effects and blank the previews.
  const urlsRef = useRef([]);

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function addFiles(fileList) {
    const incoming = Array.from(fileList ?? []).filter((f) => f && f.type.startsWith('image/'));
    if (incoming.length === 0) return;

    setPhotos((prev) => {
      const room = max - prev.length;
      if (room <= 0) {
        onLimitExceeded?.(`You can upload up to ${max} photos.`);
        return prev;
      }
      if (incoming.length > room) {
        onLimitExceeded?.(`Only ${max} photos allowed — extras were skipped.`);
      }

      const added = incoming.slice(0, room).map((file) => {
        const url = URL.createObjectURL(file);
        urlsRef.current.push(url);
        return { id: crypto.randomUUID(), file, url };
      });
      return [...prev, ...added];
    });

    onAdd?.();
    // Reset so re-picking the same file still fires a change event.
    if (inputRef.current) inputRef.current.value = '';
  }

  /** Removes one photo before submit; it is never uploaded. */
  function removePhoto(id) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
        urlsRef.current = urlsRef.current.filter((u) => u !== target.url);
      }
      return prev.filter((p) => p.id !== id);
    });
  }

  return { photos, addFiles, removePhoto, inputRef, max };
}

/**
 * Thumbnail grid + dropzone. Wrap it in a <Field> for the label, error and
 * counter, exactly like any other control.
 *
 * @param {{picker: ReturnType<typeof usePhotoPicker>, id?: string,
 *          showCover?: boolean, emptyHint?: string}} props
 */
export default function PhotoUploader({ picker, id = 'photos', showCover = false, emptyHint }) {
  const { photos, addFiles, removePhoto, inputRef, max } = picker;
  const [dragging, setDragging] = useState(false);

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        name={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className={styles.fileInput}
        onChange={(e) => addFiles(e.target.files)}
      />

      {photos.length > 0 && (
        <ul className={styles.thumbGrid}>
          {photos.map((p, i) => (
            <li key={p.id} className={styles.thumbItem}>
              {/* Local object URL, never uploaded — next/image would be overkill. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Photo ${i + 1}: ${p.file.name}`} className={styles.thumbImg} />
              <button
                type="button"
                className={styles.thumbRemove}
                onClick={() => removePhoto(p.id)}
                aria-label={`Remove ${p.file.name}`}
              >
                <IconX size={13} stroke={2.5} />
              </button>
              {showCover && i === 0 && <span className={styles.thumbBadge}>Cover</span>}
            </li>
          ))}
        </ul>
      )}

      {photos.length < max && (
        <button
          type="button"
          className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''} ${photos.length > 0 ? styles.dropzoneCompact : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
        >
          <IconUpload size={photos.length > 0 ? 16 : 20} stroke={1.75} className={styles.dropIcon} />
          <span className={styles.dropText}>
            {photos.length > 0 ? `Add more (${max - photos.length} left)` : 'Drag photos here, or tap to browse'}
          </span>
          {photos.length === 0 && emptyHint && <span className={styles.dropHint}>{emptyHint}</span>}
        </button>
      )}
    </>
  );
}
