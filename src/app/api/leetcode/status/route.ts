import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { requireUserId } from '@/lib/auth/server';
import { hasCoreDatabase, getCoreDb } from '@/lib/db/core';
import { connectedAccounts } from '@/lib/db/schema/core';

export const runtime = 'nodejs';

/**
 * GET /api/leetcode/status
 * 
 * Returns the current user's LeetCode connection and verification status.
 */
export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json({ success: false, error: 'UNAUTHORIZED', message: 'Sign in to continue.' }, { status: 401 });
  }

  if (!hasCoreDatabase()) {
    return Response.json({ success: false, error: 'NOT_CONFIGURED', message: 'Database is not configured.' }, { status: 503 });
  }

  const db = getCoreDb();

  try {
    const records = await db
      .select()
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.userId, userId),
          eq(connectedAccounts.provider, 'leetcode'),
        )
      )
      .limit(1);

    const record = records[0];

    if (!record || record.verificationStatus !== 'verified') {
      const isPending = record?.verificationStatus === 'pending' && record?.verificationCode && (!record?.expiresAt || new Date() < new Date(record.expiresAt));
      return Response.json({
        success: true,
        connected: false,
        verified: false,
        status: record ? record.verificationStatus : 'unconnected',
        username: record ? record.providerUsername : undefined,
        verification_code: isPending ? record.verificationCode : undefined,
        expires_at: isPending && record.expiresAt ? record.expiresAt.toISOString() : undefined,
      }, { status: 200 });
    }

    return Response.json({
      success: true,
      connected: true,
      verified: true,
      username: record.providerUsername,
      verified_at: record.verifiedAt ? record.verifiedAt.toISOString() : undefined,
      last_synced_at: record.lastSyncedAt ? record.lastSyncedAt.toISOString() : undefined,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('LeetCode status error:', error);
    return Response.json({
      success: false,
      error: 'SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Failed to check status.',
    }, { status: 500 });
  }
}
