'use client';

import Toast from '@/components/ui/Toast';
import { useCheckout } from '@/components/useCheckout';
import styles from './ListYourBusinessButton.module.css';

/**
 * The top bar's Checkout CTA. The flow itself lives in useCheckout, which the
 * promo banner's button shares — this component is just the pill.
 */
export default function ListYourBusinessButton() {
  const { startCheckout, loading, error, toast } = useCheckout();

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.cta}
        onClick={startCheckout}
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
    </div>
  );
}
