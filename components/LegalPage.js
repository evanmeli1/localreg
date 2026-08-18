import TopBar from './TopBar';
import styles from './LegalPage.module.css';

/**
 * Layout for the policy documents (/terms, /privacy).
 *
 * Same card language as FormPage — white card, 1px border, --radius-card, on
 * the --bg page — but wider: FormPage's 460px is sized for a column of inputs,
 * and prose set that narrow runs to a very large number of short lines. This
 * caps the measure at 720px instead.
 */
export default function LegalPage({ title, updated, intro, children }) {
  return (
    <>
      <TopBar />
      <main className={styles.shell}>
        <article className={styles.card}>
          <header className={styles.head}>
            <h1 className={styles.heading}>{title}</h1>
            {updated && <p className={styles.updated}>Last updated {updated}</p>}
            {intro && <p className={styles.intro}>{intro}</p>}
          </header>

          {children}
        </article>
      </main>
    </>
  );
}

/** One numbered-feeling section: heading plus its paragraphs. */
export function Section({ title, children }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}
