import { handleDecision } from '@/lib/admin-api';

export const dynamic = 'force-dynamic';

/** Marks a pending listing live and stamps approved_at. Logs an 'approved' event. */
export async function POST(request) {
  return handleDecision(request, 'approve');
}
