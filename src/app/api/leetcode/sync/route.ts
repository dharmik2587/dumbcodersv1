import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { requireUserId } from '@/lib/auth/server';
import { hasCoreDatabase, getCoreDb } from '@/lib/db/core';
import { connectedAccounts, leetcodeData } from '@/lib/db/schema/core';
import { fetchLeetcodeStats } from '@/lib/leetcode/service';
import { checkRateLimit } from '@/lib/leetcode/ratelimit';

export const runtime = 'nodejs';

/**
 * POST /api/leetcode/sync
 * 
 * Manually refreshes the user's LeetCode statistics.
 * Only allowed for verified accounts.
 */
export async function POST() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json({ success: false, error: 'UNAUTHORIZED', message: 'Sign in to continue.' }, { status: 401 });
  }

  if (!hasCoreDatabase()) {
    return Response.json({ success: false, error: 'NOT_CONFIGURED', message: 'Database is not configured.' }, { status: 503 });
  }

  // Rate limiting (max 5 syncs per minute)
  const rl = checkRateLimit(`sync:${userId}`, 5, 60);
  if (!rl.success) {
    return Response.json({
      success: false,
      error: 'RATE_LIMITED',
      message: 'You can only refresh statistics a few times per minute.',
    }, { status: 429 });
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
          eq(connectedAccounts.verificationStatus, 'verified'),
        )
      )
      .limit(1);

    const account = records[0];
    if (!account) {
      return Response.json({
        success: false,
        error: 'ACCOUNT_NOT_VERIFIED',
        message: 'No verified LeetCode account linked. Please verify your account first.',
      }, { status: 403 });
    }

    const stats = await fetchLeetcodeStats(account.providerUsername);
    if (!stats) {
      return Response.json({
        success: false,
        error: 'STATS_NOT_FOUND',
        message: 'Could not retrieve latest stats from LeetCode.',
      }, { status: 404 });
    }

    const now = new Date();
    await db
      .insert(leetcodeData)
      .values({
        userId,
        username: stats.username,
        totalSolved: stats.totalSolved,
        easySolved: stats.easySolved,
        mediumSolved: stats.mediumSolved,
        hardSolved: stats.hardSolved,
        ranking: stats.ranking,
        contestRating: stats.contestRating,
        contestsAttended: stats.contestsAttended,
        syncedAt: now,
      })
      .onConflictDoUpdate({
        target: leetcodeData.userId,
        set: {
          username: stats.username,
          totalSolved: stats.totalSolved,
          easySolved: stats.easySolved,
          mediumSolved: stats.mediumSolved,
          hardSolved: stats.hardSolved,
          ranking: stats.ranking,
          contestRating: stats.contestRating,
          contestsAttended: stats.contestsAttended,
          syncedAt: now,
        },
      });

    await db
      .update(connectedAccounts)
      .set({ lastSyncedAt: now })
      .where(eq(connectedAccounts.id, account.id));

    return Response.json({
      success: true,
      username: stats.username,
      stats: {
        total_solved: stats.totalSolved,
        easy_solved: stats.easySolved,
        medium_solved: stats.mediumSolved,
        hard_solved: stats.hardSolved,
        ranking: stats.ranking,
        contest_rating: stats.contestRating,
        contests_attended: stats.contestsAttended,
      },
      synced_at: now.toISOString(),
      message: 'LeetCode statistics synchronized successfully.',
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('LeetCode sync error:', error);
    return Response.json({
      success: false,
      error: 'SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Failed to sync LeetCode statistics.',
    }, { status: 500 });
  }
}
