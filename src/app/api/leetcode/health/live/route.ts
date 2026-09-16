import { failure } from '@/lib/http';

export const runtime = 'nodejs';

/**
 * GET /api/leetcode/health/live
 *
 * Lightweight liveness check confirming the backend is running.
 */
export async function GET() {
  try {
    return Response.json({
      success: true,
      status: 'live',
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  } catch {
    return failure('INTERNAL_ERROR', 'Liveness check failed', 500);
  }
}
