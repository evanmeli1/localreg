import Link from 'next/link';
import styles from './Footer.module.css';

/**
 * Site footer, rendered on every page from the root layout.
 *
 * "Manage listing" used to sit in the top bar; it kept its coming-soon
 * treatment when it moved here — it stays inert until the Stripe Customer
 * Portal exists, because that link is a generated session URL with nothing to
 * point at yet.
 */
export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.copyright}>© 2026 localreg</span>

        <nav className={styles.links}>
          {/* TODO: replace with the Stripe Customer Portal URL once billing is
              wired up. Disabled rather than routed to a stub page. */}
          <span
            className={styles.linkDisabled}
            aria-disabled="true"
            data-tooltip="Coming soon"
          >
            {/* Only the label is faded — the tooltip would inherit the opacity
                if it hung off the same element. */}
            <span className={styles.disabledLabel}>Manage listing</span>
          </span>

          <Link className={styles.link} href="/request-change">
            Request a change
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
