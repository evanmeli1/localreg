import styles from './Badge.module.css';

/**
 * Small pill label. variant: green (solid) | greenSoft | neutral | count
 */
export default function Badge({ variant = 'green', className = '', children }) {
  const cls = [styles.badge, styles[variant], className].filter(Boolean).join(' ');
  return <span className={cls}>{children}</span>;
}
