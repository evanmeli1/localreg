'use client';

import { IconChevronDown } from '@tabler/icons-react';
import styles from './Field.module.css';

/**
 * Label + control + helper/error/counter wrapper shared by every form.
 * `counter` renders bottom-right (used by the 160-char description).
 */
export function Field({ label, htmlFor, helper, error, counter, optional, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
        {optional && <span className={styles.optional}> (optional)</span>}
      </label>

      {children}

      {(helper || error || counter) && (
        <div className={styles.footer}>
          <span className={error ? styles.error : styles.helper}>
            {error || helper}
          </span>
          {counter && <span className={styles.counter}>{counter}</span>}
        </div>
      )}
    </div>
  );
}

export function TextInput({ invalid = false, className = '', ...rest }) {
  const cls = [styles.control, invalid ? styles.invalid : '', className]
    .filter(Boolean)
    .join(' ');
  return <input className={cls} {...rest} />;
}

export function Textarea({ invalid = false, className = '', ...rest }) {
  const cls = [
    styles.control,
    styles.textarea,
    invalid ? styles.invalid : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <textarea className={cls} {...rest} />;
}

export function Select({ invalid = false, className = '', children, ...rest }) {
  const cls = [
    styles.control,
    styles.select,
    invalid ? styles.invalid : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.selectWrap}>
      <select className={cls} {...rest}>
        {children}
      </select>
      <IconChevronDown
        size={16}
        stroke={2}
        className={styles.selectIcon}
        aria-hidden="true"
      />
    </div>
  );
}
