import { NextRequest } from 'next/server';
import { eq, and, ne } from 'drizzle-orm';
import { requireUserId } from '@/lib/auth/server';
import { hasCoreDatabase, getCoreDb } from '@/lib/db/core';
import { connectedAccounts } from '@/lib/db/schema/core';
import { validateLeetcodeUsername, generateVerificationCode, fetchLeetcodePublicProfile } from '@/lib/leetcode/service';
import { checkRateLimit } from '@/lib/leetcode/ratelimit';
import { failure } from '@/lib/http';

export const runtime = 'nodejs';

/**
 * POST /api/leetcode/connect
 * 
 * Initiates the verification process:
 * 1. Checks auth and rate limits
 * 2. Validates LeetCode username and existence
 * 3. Checks if username is already verified by another user
 * 4. Generates a temporary cryptographically random verification code (expires in 15 mins)
 * 5. Upserts into connected_accounts with pending status
 */
import { withApiHandler } from '@/lib/api/with-api-handler';
import { AppError } from '@/lib/api/errors';
import { success } from '@/lib/http';

export const POST = withApiHandler(
  { api: 'leetcode:connect', operation: 'connect', requireAuth: true },
  async ({ req, userId }) => {
    if (!hasCoreDatabase()) {
      throw new AppError('Database is not configured.', { code: 'NOT_CONFIGURED', statusCode: 503 });
    }

    const rl = checkRateLimit(`connect:${userId}`, 10, 60);
    if (!rl.success) {
      throw new AppError('Too many connection attempts. Please wait a moment.', { code: 'RATE_LIMITED', statusCode: 429 });
    }

    const body = await req.json().catch(() => null);
    const { valid, error: validationError, cleanUsername } = validateLeetcodeUsername(body?.username);
    if (!valid || !cleanUsername) {
      throw new AppError(validationError || 'Invalid LeetCode username.', { code: 'INVALID_USERNAME', statusCode: 400 });
    }

    const db = getCoreDb();
    const existing = await db
      .select()
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.provider, 'leetcode'),
          eq(connectedAccounts.providerUsername, cleanUsername),
          eq(connectedAccounts.verificationStatus, 'verified'),
          ne(connectedAccounts.userId, userId!),
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new AppError(`LeetCode account "${cleanUsername}" is already verified and linked to another Hackmate user.`, { code: 'ACCOUNT_ALREADY_LINKED', statusCode: 409 });
    }

    let profile;
    try {
      profile = await fetchLeetcodePublicProfile(cleanUsername);
    } catch (e: unknown) {
      throw new AppError('Unable to connect to LeetCode service.', { code: 'LEETCODE_UNAVAILABLE', statusCode: 502 });
    }

    if (!profile) {
      throw new AppError(`LeetCode user "${cleanUsername}" does not exist on LeetCode.`, { code: 'USER_NOT_FOUND', statusCode: 404 });
    }

    const existingUserRecord = await db
      .select()
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.userId, userId!),
          eq(connectedAccounts.provider, 'leetcode'),
        )
      )
      .limit(1);

    const activePending = existingUserRecord[0]?.verificationStatus === 'pending' &&
      existingUserRecord[0]?.providerUsername?.toLowerCase() === profile.username.toLowerCase() &&
      existingUserRecord[0]?.verificationCode &&
      existingUserRecord[0]?.expiresAt &&
      new Date() < new Date(existingUserRecord[0].expiresAt);

    let verificationCode: string;
    let expiresAt: Date;

    if (activePending && existingUserRecord[0].verificationCode && existingUserRecord[0].expiresAt) {
      verificationCode = existingUserRecord[0].verificationCode;
      expiresAt = new Date(existingUserRecord[0].expiresAt);
    } else {
      verificationCode = generateVerificationCode();
      expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await db
        .insert(connectedAccounts)
        .values({
          userId: userId!,
          provider: 'leetcode',
          providerUsername: profile.username,
          verificationCode,
          verificationStatus: 'pending',
          expiresAt,
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [connectedAccounts.userId, connectedAccounts.provider],
          set: {
            providerUsername: profile.username,
            verificationCode,
            verificationStatus: 'pending',
            expiresAt,
            createdAt: new Date(),
          },
        });
    }

    // Return using the old shape but wrapped in success() so it's nested in `data`.
    // The client will need updating to handle `data.success` instead of raw `success`.
    return success({
      success: true,
      status: 'pending',
      username: profile.username,
      verification_code: verificationCode,
      expires_at: expiresAt.toISOString(),
      message: 'Add this code to your public LeetCode profile and then verify.',
    });
  }
);
