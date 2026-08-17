import Link from 'next/link';
import { IconCheck } from '@tabler/icons-react';
import TopBar from './TopBar';
import styles from './FormPage.module.css';

/**
 * Centered ~460px card on the --bg background. Shared by the intake form
 * (/welcome) and the change request form (/request-change) so both pages —
 * including their submitted confirmation states — sit in the same frame.
 */
export default function FormPage({ children }) {
  return (
    <>
      <TopBar />
      <main className={styles.shell}>
        <div className={styles.card}>{children}</div>
      </main>
    </>
  );
}

/** 19px bold title + gray subtext block at the top of a form card. */
export function FormHeading({ title, subtitle, children }) {
  return (
    <header className={styles.head}>
      {children}
      <h1 className={styles.heading}>{title}</h1>
      {subtitle && <p className={styles.sub}>{subtitle}</p>}
    </header>
  );
}

/** Post-submit confirmation state — same card, swapped contents. */
export function Submitted({ title, children }) {
  return (
    <div className={styles.done}>
      <span className={styles.doneIcon}>
        <IconCheck size={22} stroke={3} />
      </span>
      <h1 className={styles.doneHeading}>{title}</h1>
      <p className={styles.doneText}>{children}</p>
      <Link href="/" className={styles.doneLink}>
        Back to directory
      </Link>
    </div>
  );
}
