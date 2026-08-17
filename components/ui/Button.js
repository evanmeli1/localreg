'use client';

import Link from 'next/link';
import styles from './Button.module.css';

/**
 * Pill button used everywhere. Renders an <a> when `href` is passed, a
 * <button> otherwise, so links and actions share one set of styles.
 *
 * variant: primary | outlineGreen | outlineRed | quiet
 * size:    md (36px) | lg (44px)
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  href,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const cls = [
    styles.base,
    styles[variant],
    styles[size],
    fullWidth ? styles.full : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (href) {
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
