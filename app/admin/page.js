'use client';

import { useState } from 'react';
import TopBar from '@/components/TopBar';
import ApprovalQueue from '@/components/admin/ApprovalQueue';
import PasswordGate from '@/components/admin/PasswordGate';

export default function AdminPage() {
  // In-memory only — a refresh re-locks the page. The password is held so the
  // queue and the approve/reject calls can replay it as a header; see the auth
  // caveats in lib/admin-api.js. Real session auth replaces this later.
  const [password, setPassword] = useState(null);

  return (
    <>
      <TopBar />
      {password ? (
        <ApprovalQueue password={password} />
      ) : (
        <PasswordGate onUnlock={setPassword} />
      )}
    </>
  );
}
