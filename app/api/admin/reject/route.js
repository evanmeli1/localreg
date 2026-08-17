import { handleDecision } from '@/lib/admin-api';

export const dynamic = 'force-dynamic';

/** Marks a pending listing rejected. Logs a 'rejected' event. */
export async function POST(request) {
  return handleDecision(request, 'reject');
}
