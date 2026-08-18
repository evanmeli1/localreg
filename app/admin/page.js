import TopBar from '@/components/TopBar';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminLogin from '@/components/admin/AdminLogin';
import { getAdminSession } from '@/lib/adminAuth';

// Rendered per request so the session cookie is always read fresh.
export const dynamic = 'force-dynamic';

/**
 * Server-side gate. The dashboard (approvals, change requests and listing
 * editing) is never sent to the browser at all unless the session verifies
 * here — this is not a client-side hide, and there is no flag the browser can
 * set to get past it. A returning admin inside the 24-hour window skips the
 * login form entirely.
 *
 * The API routes behind each panel re-check the same session independently, so
 * this gate is the convenience and requireAdmin is the enforcement.
 */
export default async function AdminPage() {
  const session = await getAdminSession();

  return (
    <>
      <TopBar />
      {session ? <AdminDashboard /> : <AdminLogin />}
    </>
  );
}
