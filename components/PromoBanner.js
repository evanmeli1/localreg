'use client';

import { useState } from 'react';
import Toast from '@/components/ui/Toast';
import TermsModal from './TermsModal';
import { useCheckout } from '@/components/useCheckout';
import styles from './PromoBanner.module.css';

/**
 * The ruby promo banner beneath the top bar on the homepage.
 *
 * Full-bleed: it renders outside DirectoryBrowser's shell so the ruby runs edge
 * to edge with no radius, sitting flush under the bar as one block. Its copy is
 * still constrained to the shell width so the headline lines up with the
 * category row below rather than hugging the viewport edge.
 *
 * Self-contained on purpose: the copy below and PromoBanner.module.css are the
 * only places to edit, and deleting the one <PromoBanner /> in DirectoryBrowser
 * removes it cleanly.
 *
 * Its button shares useCheckout with the top bar CTA, so both start the same
 * Stripe session.
 */

// Pricing copy lives here so the banner, the modal and /terms can be kept in
// step by eye. $9.99 is the genuine former price, shown struck through against
// the current $5. Display only: what Stripe charges comes from STRIPE_PRICE_ID
// and is untouched by anything in this file.
const FORMER_PRICE = '$9.99';
const CURRENT_PRICE = '$5/mo';
const CTA_LABEL = 'List your business';

export default function PromoBanner() {
  const { startCheckout, loading, error, toast } = useCheckout();
  const [termsOpen, setTermsOpen] = useState(false);

  return (
    <section className={styles.banner} aria-labelledby="promo-headline">
      <TornPaper />

      <div className={styles.inner}>
        {/* Sits above the decoration so the artwork can bleed behind the text. */}
        <div className={styles.content}>
          <h2 id="promo-headline" className={styles.headline}>
            List your business for {CURRENT_PRICE}{' '}
            {/* Trails the live price, small and knocked back. <s> rather than
                styling alone: it marks the price as no longer accurate for
                assistive tech too, not just visually. The space above is real,
                not just the margin, so it is still a word break when read aloud. */}
            <s className={styles.formerPrice}>{FORMER_PRICE}</s>
          </h2>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cta}
              onClick={startCheckout}
              disabled={loading}
            >
              {loading ? 'Starting…' : CTA_LABEL}
            </button>

            {/* A button, not a link: the pricing summary opens in place rather
                than sending anyone away from the directory. /terms is still
                reachable from inside the modal and the footer. */}
            <button
              type="button"
              className={styles.terms}
              onClick={() => setTermsOpen(true)}
            >
              Terms apply
            </button>
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />

      <Toast toast={toast} />
    </section>
  );
}

/**
 * Torn-paper shapes with a discount badge, tucked into the top-right corner.
 *
 * Inline SVG rather than CSS shapes: the polygons need irregular, hand-torn
 * edges, which clip-path could do but not readably — the point list is easier
 * to nudge than a string of percentages. Purely decorative, so it is hidden
 * from assistive tech and ignores pointer events (see the stylesheet).
 */
function TornPaper() {
  return (
    <svg
      className={styles.decoration}
      viewBox="0 0 280 170"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Back sheet — the largest and faintest, angled away from the corner. */}
      <polygon
        className={styles.sheetBack}
        points="96,6 186,0 204,26 178,44 214,64 200,104 148,112 120,86 138,58 92,44"
      />
      {/* Middle sheet, offset right to read as a second torn layer. */}
      <polygon
        className={styles.sheetMid}
        points="170,0 262,10 250,40 276,58 254,96 206,88 190,60 214,42 176,28"
      />
      {/* Front sliver — smallest and brightest, catching the corner light. */}
      <polygon
        className={styles.sheetFront}
        points="214,4 268,0 280,30 258,36 268,58 226,52 216,30 236,22"
      />

      {/* Discount badge, overlapping the sheets so the corner reads as one
          cluster rather than a floating dot. --red is the site's existing
          accent, so the banner introduces no new colour beyond its own ruby. */}
      <circle className={styles.badgeCircle} cx="234" cy="96" r="26" />
      <text className={styles.badgeMark} x="234" y="97">
        %
      </text>
    </svg>
  );
}
