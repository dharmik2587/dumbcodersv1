import { sql } from 'drizzle-orm';
import { getCoreDb, hasCoreDatabase } from '@/lib/db/core';
import { success } from '@/lib/http';
import { isPusherConfigured } from '@/lib/pusher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  let dbStatus: 'healthy' | 'unhealthy' | 'not_configured' = 'not_configured';

  if (hasCoreDatabase()) {
    try {
      const db = getCoreDb();
      await db.execute(sql`SELECT 1`);
      dbStatus = 'healthy';
    } catch (dbErr) {
      console.error('[Health] DB ping failed:', dbErr);
      dbStatus = 'unhealthy';
    }
  }

  const pusherConfigured = isPusherConfigured();
  const pusherStatus = pusherConfigured ? 'healthy' : 'unconfigured';
  const overallStatus = dbStatus === 'healthy' ? 'healthy' : 'degraded';

  return success({
    status: overallStatus,
    database: dbStatus,
    pusher: pusherStatus,
    latencyMs: Date.now() - start,
    timestamp: new Date().toISOString(),
  });
}
