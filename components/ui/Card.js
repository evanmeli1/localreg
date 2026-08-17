import styles from './Card.module.css';

/**
 * White bordered surface, 12px radius. Pass `title` for the small 13px bold
 * heading used on the listing detail cards ("About", "Details").
 */
export default function Card({ title, padded = true, className = '', children }) {
  const cls = [styles.card, padded ? styles.padded : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={cls}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {children}
    </section>
  );
}
