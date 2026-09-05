import { hasCoreDatabase, getCoreDb } from '@/lib/db/core';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

/**
 * GET /api/leetcode/health/ready
 * 
 * Readiness check confirming database and required configuration are ready.
 */
export async function GET() {
  if (!hasCoreDatabase()) {
    return Response.json({
      success: false,
      status: 'not_ready',
      error: 'DATABASE_NOT_CONFIGURED',
      message: 'CORE_DATABASE_URL is missing or invalid.',
    }, { status: 503 });
  }

  try {
    const db = getCoreDb();
    await db.execute(sql`SELECT 1`);
    
    // Check connected_accounts table exists
    await db.execute(sql`SELECT count(*) FROM connected_accounts LIMIT 1`);

    return Response.json({
      success: true,
      status: 'ready',
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  } catch (error: any) {
    return Response.json({
      success: false,
      status: 'not_ready',
      error: 'DATABASE_ERROR',
      message: error.message || 'Database readiness check failed.',
    }, { status: 503 });
  }
}
