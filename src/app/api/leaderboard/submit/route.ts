import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireUserId } from '@/lib/auth/server';
import { hasCoreDatabase, getCoreDb } from '@/lib/db/core';
import { githubData, leetcodeData, profiles } from '@/lib/db/schema/core';
import { fetchLeetcodeStats } from '@/lib/leaderboard/leetcode';
import { fetchGithubPublicStats } from '@/lib/leaderboard/github-public';
import { failure, success } from '@/lib/http';
import { enforceRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

const VALID_PLATFORMS = ['leetcode', 'github'] as const;
type Platform = (typeof VALID_PLATFORMS)[number];

/**
 * POST /api/leaderboard/submit
 *
 * Body: { platform: "leetcode" | "github", username: string }
 *
 * 1. Validates the username against the external API
 * 2. Upserts stats into the DB
 * 3. Returns the fetched data
 */
export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return failure('UNAUTHORIZED', 'Sign in to continue.', 401);
  }

  if (!hasCoreDatabase()) {
    return failure('NOT_CONFIGURED', 'Database is not configured.', 503);
  }

  const rl = await enforceRateLimit(`leaderboard-submit:${userId}`, 10, 60);
  if (!rl.success && rl.response) return rl.response;

  let body: { platform?: string; username?: string };
  try {
    body = await request.json();
  } catch {
    return failure('INVALID_BODY', 'Request body must be JSON.', 400);
  }

  const platform = body.platform as Platform;
  const username = (body.username ?? '').trim();

  if (!VALID_PLATFORMS.includes(platform)) {
    return failure('INVALID_PLATFORM', 'Platform must be "leetcode" or "github".', 400);
  }

  if (!username || username.length < 1 || username.length > 64) {
    return failure('INVALID_USERNAME', 'Username must be 1–64 characters.', 400);
  }

  // Simple format check: alphanumeric + hyphens + underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return failure('INVALID_USERNAME', 'Username contains invalid characters.', 400);
  }

  const db = getCoreDb();

  try {
    if (platform === 'leetcode') {
      const stats = await fetchLeetcodeStats(username);
      if (!stats) {
        return failure('USER_NOT_FOUND', `LeetCode user "${username}" does not exist.`, 404);
      }

      // Upsert leetcode_data
      const [saved] = await db
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
          syncedAt: new Date(),
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
            syncedAt: new Date(),
          },
        })
        .returning();

      // Update profile with the leetcode username
      await db
        .update(profiles)
        .set({ leetcodeUsername: stats.username, updatedAt: new Date() })
        .where(eq(profiles.id, userId));

      return success({
        platform: 'leetcode',
        stats: saved,
        message: `LeetCode profile "${stats.username}" linked successfully.`,
      });
    } else {
      // GitHub
      const stats = await fetchGithubPublicStats(username);
      if (!stats) {
        return failure('USER_NOT_FOUND', `GitHub user "${username}" does not exist.`, 404);
      }

      // Upsert github_data
      const [saved] = await db
        .insert(githubData)
        .values({
          userId,
          username: stats.username,
          profileUrl: stats.profileUrl,
          bio: stats.bio,
          avatarUrl: stats.avatarUrl,
          publicRepos: stats.publicRepos,
          followers: stats.followers,
          following: stats.following,
          languages: stats.languages,
          publicRepositoryCount: stats.publicRepos,
          syncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: githubData.userId,
          set: {
            username: stats.username,
            profileUrl: stats.profileUrl,
            bio: stats.bio,
            avatarUrl: stats.avatarUrl,
            publicRepos: stats.publicRepos,
            followers: stats.followers,
            following: stats.following,
            languages: stats.languages,
            publicRepositoryCount: stats.publicRepos,
            syncedAt: new Date(),
          },
        })
        .returning();

      // Update profile with the github username
      await db
        .update(profiles)
        .set({ githubUsername: stats.username, updatedAt: new Date() })
        .where(eq(profiles.id, userId));

      return success({
        platform: 'github',
        stats: saved,
        message: `GitHub profile "${stats.username}" linked successfully.`,
      });
    }
  } catch (error: unknown) {
    console.error(`POST /api/leaderboard/submit [${platform}] failed`, error);
    return failure(
      'FETCH_FAILED',
      `Could not fetch ${platform} data. The service may be temporarily unavailable.`,
      502,
    );
  }
}
