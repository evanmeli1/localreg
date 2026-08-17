'use client';

import { useState } from 'react';
import TopBar from '@/components/TopBar';
import ApprovalQueue from '@/components/admin/ApprovalQueue';
import PasswordGate from '@/components/admin/PasswordGate';

export default function AdminPage() {
  // Session state only — a refresh re-locks the page. Real auth replaces this.
  const [unlocked, setUnlocked] = useState(false);

  return (
    <>
      <TopBar />
      {unlocked ? (
        <ApprovalQueue />
      ) : (
        <PasswordGate onUnlock={() => setUnlocked(true)} />
      )}
    </>
  );
}
