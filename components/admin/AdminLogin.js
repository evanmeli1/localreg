'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconLock } from '@tabler/icons-react';
import Button from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import styles from './PasswordGate.module.css';

/**
 * Posts to /api/admin/login. On success the server sets an HttpOnly cookie —
 * nothing is stored here, and nothing is kept in localStorage or component
 * state. router.refresh() then re-runs the /admin server component, which sees
 * the new cookie and renders the queue.
 */
export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (checking) return;

    setChecking(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setPassword('');
        router.refresh();
        return;
      }

      const body = await res.json().catch(() => ({}));
      if (res.status === 429) {
        const retry = res.headers.get('Retry-After');
        setError(
          retry
            ? `Too many attempts. Try again in ${Math.ceil(Number(retry) / 60)} min.`
            : 'Too many attempts. Try again later.',
        );
      } else {
        setError(body.error || 'Invalid password');
      }
    } catch (err) {
      console.error('[admin] login request failed', err);
      setError('Could not reach the server. Please try again.');
    }

    setChecking(false);
  }

  return (
    <main className={styles.shell}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <span className={styles.icon}>
          <IconLock size={20} stroke={1.75} />
        </span>

        <h1 className={styles.heading}>Admin access</h1>
        <p className={styles.sub}>Sign in to review the approval queue.</p>

        <div className={styles.form}>
          <Field label="Password" htmlFor="password" error={error}>
            <TextInput
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              invalid={Boolean(error)}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="••••••••"
            />
          </Field>

          <Button type="submit" size="lg" fullWidth disabled={checking}>
            {checking ? 'Signing in…' : 'Sign in'}
          </Button>
        </div>
      </form>
    </main>
  );
}
