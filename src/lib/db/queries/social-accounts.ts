import { and, eq } from 'drizzle-orm';
import { getCoreDb } from '../core';
import {
  socialAccounts,
  SocialAccount,
  SocialPlatform,
  SOCIAL_PLATFORMS,
} from '../schema/core';

export { SOCIAL_PLATFORMS };
export type { SocialAccount, SocialPlatform };

/**
 * List all social accounts connected by a user.
 */
export async function listSocialAccounts(userId: string): Promise<SocialAccount[]> {
  const db = getCoreDb();
  return db
    .select()
    .from(socialAccounts)
    .where(eq(socialAccounts.userId, userId))
    .orderBy(socialAccounts.createdAt);
}

/**
 * Get a specific social account by userId and platform.
 */
export async function getSocialAccountByPlatform(
  userId: string,
  platform: SocialPlatform
): Promise<SocialAccount | null> {
  const db = getCoreDb();
  const [account] = await db
    .select()
    .from(socialAccounts)
    .where(and(eq(socialAccounts.userId, userId), eq(socialAccounts.platform, platform)))
    .limit(1);

  return account ?? null;
}

/**
 * Check if a provider account is already linked to another user (anti-hijack check).
 */
export async function getSocialAccountByProvider(
  platform: SocialPlatform,
  providerUserId: string
): Promise<SocialAccount | null> {
  const db = getCoreDb();
  const [account] = await db
    .select()
    .from(socialAccounts)
    .where(
      and(
        eq(socialAccounts.platform, platform),
        eq(socialAccounts.providerUserId, providerUserId)
      )
    )
    .limit(1);

  return account ?? null;
}

/**
 * Upserts a social account (exactly one record per platform per user).
 */
export async function upsertSocialAccount(
  userId: string,
  data: {
    platform: SocialPlatform;
    username?: string | null;
    displayName?: string | null;
    profileUrl?: string | null;
    providerUserId?: string | null;
    isVerified?: boolean;
    verifiedAt?: Date | null;
    metadata?: Record<string, unknown>;
  }
): Promise<SocialAccount> {
  const db = getCoreDb();
  const now = new Date();

  // If providerUserId is provided, check if it belongs to someone else
  if (data.providerUserId) {
    const existingProvider = await getSocialAccountByProvider(
      data.platform,
      data.providerUserId
    );
    if (existingProvider && existingProvider.userId !== userId) {
      throw new Error(
        `This ${data.platform} account is already connected to another HackMate profile.`
      );
    }
  }

  const [saved] = await db
    .insert(socialAccounts)
    .values({
      userId,
      platform: data.platform,
      username: data.username ?? null,
      displayName: data.displayName ?? null,
      profileUrl: data.profileUrl ?? null,
      providerUserId: data.providerUserId ?? null,
      isVerified: data.isVerified ?? false,
      verifiedAt: data.verifiedAt ?? null,
      metadata: data.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [socialAccounts.userId, socialAccounts.platform],
      set: {
        username: data.username ?? null,
        displayName: data.displayName ?? null,
        profileUrl: data.profileUrl ?? null,
        providerUserId: data.providerUserId ?? null,
        isVerified: data.isVerified ?? false,
        verifiedAt: data.verifiedAt ?? null,
        metadata: data.metadata ?? {},
        updatedAt: now,
      },
    })
    .returning();

  return saved;
}

/**
 * Delete a social account owned by the user.
 */
export async function deleteSocialAccount(
  userId: string,
  accountId: string
): Promise<boolean> {
  const db = getCoreDb();
  const deleted = await db
    .delete(socialAccounts)
    .where(and(eq(socialAccounts.id, accountId), eq(socialAccounts.userId, userId)))
    .returning({ id: socialAccounts.id });

  return deleted.length > 0;
}

/**
 * Synchronize OAuth identities from Supabase user object into social_accounts.
 */
export async function syncUserSocialIdentities(user: {
  id: string;
  identities?: Array<{
    id: string;
    provider: string;
    identity_data?: Record<string, unknown>;
  }>;
  user_metadata?: Record<string, unknown>;
}): Promise<SocialAccount[]> {
  if (!user?.identities || !Array.isArray(user.identities)) {
    return [];
  }

  const synced: SocialAccount[] = [];

  for (const identity of user.identities) {
    const provider = identity.provider?.toLowerCase();
    if (provider === 'github' || provider === 'discord') {
      const platform = provider as SocialPlatform;
      const data = identity.identity_data || {};
      const username = (data.user_name || data.preferred_username || data.name || data.nickname || '') as string;
      const displayName = (data.full_name || data.name || username || null) as string;
      let profileUrl: string | null = null;
      if (platform === 'github' && username) {
        profileUrl = `https://github.com/${username}`;
      }

      try {
        const account = await upsertSocialAccount(user.id, {
          platform,
          username: username || null,
          displayName: displayName || null,
          profileUrl,
          providerUserId: identity.id,
          isVerified: true,
          verifiedAt: new Date(),
          metadata: { provider, identityId: identity.id },
        });
        synced.push(account);
      } catch (err) {
        console.error(`[Social Auth] Failed to sync ${platform} for user ${user.id}:`, err);
        throw err;
      }
    }
  }

  return synced;
}

