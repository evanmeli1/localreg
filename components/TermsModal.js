'use client';

import Link from 'next/link';
import Modal from './Modal';
import Toast from '@/components/ui/Toast';
import { useCheckout } from '@/components/useCheckout';
import styles from './TermsModal.module.css';

/**
 * The pricing summary behind the banner's "Terms apply" link.
 *
 * Deliberately plain about the billing model: there is no trial and no
 * introductory rate, so the copy says the charge starts at signup rather than
 * implying a free window. /terms remains the authoritative document — this is
 * a summary and links out to it.
 */

// `value` may be a string or a node. Price uses a node so the superseded
// $9.99 can be struck through; the amount actually charged is set by
// STRIPE_PRICE_ID and is not affected by anything here.
const SECTIONS = [
  {
    label: 'Price',
    value: (
      <>
        <s className={styles.formerPrice}>$9.99</s> $5.00 USD, billed monthly
      </>
    ),
  },
  {
    label: 'Billing',
    value:
      'Charged automatically each month until cancelled. There is no trial period, so billing starts immediately upon signup.',
  },
  {
    label: 'Cancellation',
    value: 'Cancel anytime from your billing portal. No cancellation fees.',
  },
];

export default function TermsModal({ open, onClose }) {
  const { startCheckout, loading, error, toast } = useCheckout();

  function listYourBusiness() {
    // Close first: the page is about to navigate to Stripe, and leaving the
    // modal mounted would flash it over the redirect.
    onClose();
    startCheckout();
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="terms-modal-title">
      <h2 id="terms-modal-title" className={styles.title}>
        Directory Listing, <s className={styles.formerPrice}>$9.99</s> $5/month
      </h2>

      <dl className={styles.sections}>
        {SECTIONS.map((section) => (
          <div key={section.label} className={styles.section}>
            <dt className={styles.label}>{section.label}</dt>
            <dd className={styles.value}>{section.value}</dd>
          </div>
        ))}

        <div className={styles.section}>
          <dt className={styles.label}>Details</dt>
          <dd className={styles.value}>
            Your listing shows your business name, category, description, contact
            details, website and photos in the public directory, where visitors can
            browse and search for it. Every submission is reviewed before it goes
            live, so a new listing takes a little time to appear. Full terms are
            available at{' '}
            <Link className={styles.inlineLink} href="/terms" onClick={onClose}>
              /terms
            </Link>
            .
          </dd>
        </div>
      </dl>

      <button type="button" className={styles.primary} onClick={onClose}>
        Got it
      </button>

      <button
        type="button"
        className={styles.secondary}
        onClick={listYourBusiness}
        disabled={loading}
      >
        {loading ? 'Starting…' : 'List your business'}
      </button>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <Toast toast={toast} />
    </Modal>
  );
}
