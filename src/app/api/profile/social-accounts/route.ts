import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getOptionalUser, requireUserId } from '@/lib/auth/server';
import { failure, success } from '@/lib/http';
import { enforceRateLimit } from '@/lib/ratelimit';
import {
  listSocialAccounts,
  upsertSocialAccount,
  SOCIAL_PLATFORMS,
} from '@/lib/db/queries/social-accounts';

export const runtime = 'nodejs';

const manualSocialSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  username: z.string().trim().max(100).optional().nullable(),
  displayName: z.string().trim().max(100).optional().nullable(),
  profileUrl: z.string().trim().max(500).optional().nullable(),
});

/**
 * GET /api/profile/social-accounts
 * List social accounts for current user (or ?userId= query param for public view)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get('userId');

  let effectiveUserId = targetUserId;
  if (!effectiveUserId) {
    const user = await getOptionalUser();
    if (!user) {
      return failure('UNAUTHORIZED', 'Sign in to continue.', 401);
    }
    effectiveUserId = user.id;
  }

  try {
    const accounts = await listSocialAccounts(effectiveUserId);
    return success(accounts);
  } catch (error) {
    console.error('GET /api/profile/social-accounts failed:', error);
    return failure('INTERNAL_ERROR', 'Failed to retrieve social accounts.', 500);
  }
}

/**
 * POST /api/profile/social-accounts
 * Create or update a manual social profile (LinkedIn, Telegram, Portfolio, etc.)
 */
export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return failure('UNAUTHORIZED', 'Sign in to continue.', 401);
  }

  const rateCheck = await enforceRateLimit(`social:post:${userId}`, 10, 60);
  if (!rateCheck.success) {
    return rateCheck.response!;
  }

  const body = await request.json().catch(() => null);
  const parsed = manualSocialSchema.safeParse(body);

  if (!parsed.success) {
    return failure('BAD_REQUEST', parsed.error.issues[0]?.message ?? 'Invalid social account data.', 400);
  }

  const { platform, displayName } = parsed.data;
  let { username, profileUrl } = parsed.data;

  // GitHub and Discord must be linked via verified OAuth provider
  if (platform === 'github' || platform === 'discord') {
    return failure(
      'BAD_REQUEST',
      `${platform === 'github' ? 'GitHub' : 'Discord'} must be connected via the official OAuth verification flow.`,
      400
    );
  }

  // Format and sanitize based on platform
  if (platform === 'telegram') {
    if (username) {
      username = username.replace(/^@+/, '');
      if (!profileUrl) {
        profileUrl = `https://t.me/${username}`;
      }
    }
  } else if (platform === 'linkedin') {
    if (profileUrl && !profileUrl.startsWith('http://') && !profileUrl.startsWith('https://')) {
      profileUrl = `https://${profileUrl}`;
    }
  } else if (platform === 'x') {
    if (username) {
      username = username.replace(/^@+/, '');
      if (!profileUrl) {
        profileUrl = `https://x.com/${username}`;
      }
    }
  } else if (platform === 'portfolio') {
    if (profileUrl && !profileUrl.startsWith('http://') && !profileUrl.startsWith('https://')) {
      profileUrl = `https://${profileUrl}`;
    }
  }

  try {
    const saved = await upsertSocialAccount(userId, {
      platform,
      username: username || null,
      displayName: displayName || null,
      profileUrl: profileUrl || null,
      isVerified: false,
      providerUserId: null,
    });

    return success(saved, { status: 201 });
  } catch (error) {
    console.error('POST /api/profile/social-accounts failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to save social account';
    return failure('INTERNAL_ERROR', msg, 500);
  }
}
