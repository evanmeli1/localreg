'use client';

import { useState } from 'react';
import { IconLock } from '@tabler/icons-react';
import Button from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import styles from './PasswordGate.module.css';

// The password itself lives in the ADMIN_PASSWORD env var and is checked
// server-side by /api/admin/auth, so it never reaches the client bundle.
//
// ⚠️ Still a placeholder: there is no session, so the password is held in
// memory and replayed on every admin request. Replace with real session-based
// auth before launch — see the note in lib/admin-api.js.

export default function PasswordGate({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (checking) return;

    setChecking(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        onUnlock(password);
        return;
      }

      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Incorrect password.');
    } catch (err) {
      console.error('[admin] auth request failed', err);
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
        <p className={styles.sub}>Enter the admin password to view the queue.</p>

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
            {checking ? 'Checking…' : 'Enter'}
          </Button>
        </div>
      </form>
    </main>
  );
}
