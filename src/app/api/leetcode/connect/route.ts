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
export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json({ success: false, error: 'UNAUTHORIZED', message: 'Sign in to continue.' }, { status: 401 });
  }

  if (!hasCoreDatabase()) {
    return Response.json({ success: false, error: 'NOT_CONFIGURED', message: 'Database is not configured.' }, { status: 503 });
  }

  // Rate limiting (max 10 connect requests per minute per user)
  const rl = checkRateLimit(`connect:${userId}`, 10, 60);
  if (!rl.success) {
    return Response.json({ success: false, error: 'RATE_LIMITED', message: 'Too many connection attempts. Please wait a moment.' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'INVALID_BODY', message: 'Request body must be JSON.' }, { status: 400 });
  }

  const { valid, error: validationError, cleanUsername } = validateLeetcodeUsername(body?.username);
  if (!valid || !cleanUsername) {
    return Response.json({ success: false, error: 'INVALID_USERNAME', message: validationError || 'Invalid LeetCode username.' }, { status: 400 });
  }

  const db = getCoreDb();

  try {
    // Check if this username is already verified by another Hackmate user
    const existing = await db
      .select()
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.provider, 'leetcode'),
          eq(connectedAccounts.providerUsername, cleanUsername),
          eq(connectedAccounts.verificationStatus, 'verified'),
          ne(connectedAccounts.userId, userId),
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return Response.json({
        success: false,
        error: 'ACCOUNT_ALREADY_LINKED',
        message: `LeetCode account "${cleanUsername}" is already verified and linked to another Hackmate user.`,
      }, { status: 409 });
    }

    // Verify user exists on LeetCode
    let profile;
    try {
      profile = await fetchLeetcodePublicProfile(cleanUsername);
    } catch (e: any) {
      return Response.json({
        success: false,
        error: 'LEETCODE_UNAVAILABLE',
        message: `Unable to connect to LeetCode: ${e.message || 'Service unreachable'}`,
      }, { status: 502 });
    }

    if (!profile) {
      return Response.json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: `LeetCode user "${cleanUsername}" does not exist on LeetCode.`,
      }, { status: 404 });
    }

    // Check if user already has an active, unexpired pending code for this username
    const existingUserRecord = await db
      .select()
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.userId, userId),
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
      // Reuse existing active pending code so user doesn't get invalidated while copying/pasting
      verificationCode = existingUserRecord[0].verificationCode;
      expiresAt = new Date(existingUserRecord[0].expiresAt);
    } else {
      verificationCode = generateVerificationCode();
      expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

      // Upsert into connected_accounts for this user and provider
      await db
        .insert(connectedAccounts)
        .values({
          userId,
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

    return Response.json({
      success: true,
      status: 'pending',
      username: profile.username,
      verification_code: verificationCode,
      expires_at: expiresAt.toISOString(),
      message: 'Add this code to your public LeetCode profile and then verify.',
    }, { status: 200 });
  } catch (error: any) {
    console.error('LeetCode connect error:', error);
    return Response.json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || 'An internal error occurred.',
    }, { status: 500 });
  }
}
