import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { requireUserId } from '@/lib/auth/server';
import { hasCoreDatabase, getCoreDb } from '@/lib/db/core';
import { connectedAccounts, leetcodeData } from '@/lib/db/schema/core';
import { fetchLeetcodeStats } from '@/lib/leetcode/service';

export const runtime = 'nodejs';

/**
 * GET /api/leetcode/stats
 * 
 * Returns public LeetCode statistics for the authenticated user's verified account.
 * Reads from DB cache or fetches fresh from LeetCode if not yet cached.
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

    // Try reading cached stats from leetcode_data
    const cachedStats = await db
      .select()
      .from(leetcodeData)
      .where(eq(leetcodeData.userId, userId))
      .limit(1);

    if (cachedStats.length > 0) {
      const data = cachedStats[0];
      return Response.json({
        success: true,
        username: data.username,
        stats: {
          total_solved: data.totalSolved,
          easy_solved: data.easySolved,
          medium_solved: data.mediumSolved,
          hard_solved: data.hardSolved,
          ranking: data.ranking,
          contest_rating: data.contestRating,
          contests_attended: data.contestsAttended,
        },
        synced_at: data.syncedAt.toISOString(),
      }, { status: 200 });
    }

    // Fetch fresh from LeetCode if no cached stats
    const stats = await fetchLeetcodeStats(account.providerUsername);
    if (!stats) {
      return Response.json({
        success: false,
        error: 'STATS_NOT_FOUND',
        message: 'Could not retrieve stats from LeetCode.',
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
    }, { status: 200 });
  } catch (error: any) {
    console.error('LeetCode stats error:', error);
    return Response.json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || 'Failed to retrieve LeetCode statistics.',
    }, { status: 500 });
  }
}
