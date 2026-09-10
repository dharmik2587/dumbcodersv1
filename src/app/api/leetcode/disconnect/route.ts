import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { requireUserId } from '@/lib/auth/server';
import { hasCoreDatabase, getCoreDb } from '@/lib/db/core';
import { connectedAccounts, leetcodeData, profiles } from '@/lib/db/schema/core';

export const runtime = 'nodejs';

/**
 * DELETE /api/leetcode/disconnect
 * 
 * Disconnects the currently authenticated user's LeetCode account.
 */
export async function DELETE() {
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
    // Delete connected_account record
    await db
      .delete(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.userId, userId),
          eq(connectedAccounts.provider, 'leetcode'),
        )
      );

    // Remove leetcode_data cache
    await db
      .delete(leetcodeData)
      .where(eq(leetcodeData.userId, userId));

    // Clear leetcodeUsername in profile
    await db
      .update(profiles)
      .set({ leetcodeUsername: null, updatedAt: new Date() })
      .where(eq(profiles.id, userId));

    return Response.json({
      success: true,
      message: 'LeetCode account disconnected.',
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('LeetCode disconnect error:', error);
    return Response.json({
      success: false,
      error: 'SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Failed to disconnect LeetCode account.',
    }, { status: 500 });
  }
}
