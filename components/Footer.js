import Link from 'next/link';
import styles from './Footer.module.css';

/**
 * Site footer, rendered on every page from the root layout.
 *
 * "Manage listing" and "Request a change" used to be two entries — one inert
 * placeholder waiting on the Stripe Customer Portal, one real link. They did
 * the same job from the visitor's side, so they are now a single active
 * "Manage listing" pointing at /request-change.
 */
export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.copyright}>© 2026 localreg</span>

        <nav className={styles.links}>
          <Link className={styles.link} href="/request-change">
            Manage listing
          </Link>
          <Link className={styles.link} href="/terms">
            Terms
          </Link>
          <Link className={styles.link} href="/privacy">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
