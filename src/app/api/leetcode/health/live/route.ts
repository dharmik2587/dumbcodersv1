export const runtime = 'nodejs';

/**
 * GET /api/leetcode/health/live
 * 
 * Lightweight liveness check confirming the backend is running.
 */
export async function GET() {
  return Response.json({
    success: true,
    status: 'live',
    timestamp: new Date().toISOString(),
  }, { status: 200 });
}
