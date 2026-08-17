import TopBar from '@/components/TopBar';
import ApprovalQueue from '@/components/admin/ApprovalQueue';
import AdminLogin from '@/components/admin/AdminLogin';
import { getAdminSession } from '@/lib/adminAuth';

// Rendered per request so the session cookie is always read fresh.
export const dynamic = 'force-dynamic';

/**
 * Server-side gate. The queue component is never sent to the browser at all
 * unless the session verifies here — this is not a client-side hide, and there
 * is no flag the browser can set to get past it. A returning admin inside the
 * 24-hour window skips the login form entirely.
 */
export default async function AdminPage() {
  const session = await getAdminSession();

  return (
    <>
      <TopBar />
      {session ? <ApprovalQueue /> : <AdminLogin />}
    </>
  );
}
