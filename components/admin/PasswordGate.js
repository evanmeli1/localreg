'use client';

import { useState } from 'react';
import { IconLock } from '@tabler/icons-react';
import Button from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import styles from './PasswordGate.module.css';

// TODO: placeholder only. Replace with real auth (Supabase session + a server-
// side role check) before production — this constant ships to the browser and
// gates nothing that an attacker couldn't bypass by editing client state.
const ADMIN_PASSWORD = 'localreg';

export default function PasswordGate({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onUnlock();
      return;
    }
    setError('Incorrect password.');
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

          <Button type="submit" size="lg" fullWidth>
            Enter
          </Button>
        </div>
      </form>
    </main>
  );
}
