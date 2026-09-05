import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { requireUserId } from '@/lib/auth/server';
import { hasCoreDatabase, getCoreDb } from '@/lib/db/core';
import { connectedAccounts, leetcodeData, profiles } from '@/lib/db/schema/core';
import { validateLeetcodeUsername, fetchLeetcodePublicProfile, verifyCodeInProfile, fetchLeetcodeStats } from '@/lib/leetcode/service';
import { checkRateLimit } from '@/lib/leetcode/ratelimit';

export const runtime = 'nodejs';

/**
 * POST /api/leetcode/verify
 * 
 * Verifies that the temporary code is placed on the user's public LeetCode profile.
 * 1. Checks verification record and expiration
 * 2. Fetches public profile from LeetCode
 * 3. Inspects fields for the verification code
 * 4. On match: marks verified, stores verified_at, clears code, syncs stats to leetcode_data and updates profile
 * 5. On mismatch: leaves pending and returns VERIFICATION_CODE_NOT_FOUND
 */
export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json({ success: false, verified: false, error: 'UNAUTHORIZED', message: 'Sign in to continue.' }, { status: 401 });
  }

  if (!hasCoreDatabase()) {
    return Response.json({ success: false, verified: false, error: 'NOT_CONFIGURED', message: 'Database is not configured.' }, { status: 503 });
  }

  // Rate limiting (max 15 verification attempts per minute)
  const rl = checkRateLimit(`verify:${userId}`, 15, 60);
  if (!rl.success) {
    return Response.json({
      success: false,
      verified: false,
      error: 'RATE_LIMITED',
      message: 'Too many verification attempts. Please wait a minute before retrying.',
    }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, verified: false, error: 'INVALID_BODY', message: 'Request body must be JSON.' }, { status: 400 });
  }

  const { valid, error: validationError, cleanUsername } = validateLeetcodeUsername(body?.username);
  if (!valid || !cleanUsername) {
    return Response.json({ success: false, verified: false, error: 'INVALID_USERNAME', message: validationError || 'Invalid LeetCode username.' }, { status: 400 });
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

    if (!record || !record.verificationCode) {
      return Response.json({
        success: false,
        verified: false,
        error: 'NO_PENDING_VERIFICATION',
        message: 'No pending verification was found. Please request a new verification code first.',
      }, { status: 400 });
    }

    // Check expiration
    if (record.expiresAt && new Date() > new Date(record.expiresAt)) {
      return Response.json({
        success: false,
        verified: false,
        error: 'VERIFICATION_EXPIRED',
        message: 'Verification code has expired. Please initiate connection again.',
      }, { status: 400 });
    }

    // Fetch public profile
    let profile;
    try {
      profile = await fetchLeetcodePublicProfile(cleanUsername);
    } catch (e: any) {
      return Response.json({
        success: false,
        verified: false,
        error: 'LEETCODE_UNAVAILABLE',
        message: `Unable to fetch profile from LeetCode: ${e.message || 'Service unreachable'}`,
      }, { status: 502 });
    }

    if (!profile) {
      return Response.json({
        success: false,
        verified: false,
        error: 'USER_NOT_FOUND',
        message: `LeetCode profile "${cleanUsername}" was not found.`,
      }, { status: 404 });
    }

    // Check code in profile
    const isCodePresent = verifyCodeInProfile(profile, record.verificationCode);

    if (!isCodePresent) {
      return Response.json({
        success: false,
        verified: false,
        error: 'VERIFICATION_CODE_NOT_FOUND',
        message: 'Verification code was not found on the LeetCode profile.',
      }, { status: 400 });
    }

    // Code matched! Mark verified
    const now = new Date();
    await db
      .update(connectedAccounts)
      .set({
        providerUsername: profile.username,
        verificationStatus: 'verified',
        verificationCode: null, // Invalidate/clear code
        verifiedAt: now,
        lastSyncedAt: now,
      })
      .where(eq(connectedAccounts.id, record.id));

    // Fetch and sync stats for leaderboard
    let stats = null;
    try {
      stats = await fetchLeetcodeStats(profile.username);
      if (stats) {
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
      }
    } catch (err) {
      console.warn('Could not auto-sync stats immediately after verification:', err);
    }

    // Update profile
    await db
      .update(profiles)
      .set({ leetcodeUsername: profile.username, updatedAt: now })
      .where(eq(profiles.id, userId));

    return Response.json({
      success: true,
      verified: true,
      username: profile.username,
      message: 'LeetCode account verified successfully.',
    }, { status: 200 });
  } catch (error: any) {
    console.error('LeetCode verify error:', error);
    return Response.json({
      success: false,
      verified: false,
      error: 'SERVER_ERROR',
      message: error.message || 'An internal error occurred during verification.',
    }, { status: 500 });
  }
}
