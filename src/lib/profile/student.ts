import { eq, or } from 'drizzle-orm';
import { getCoreDb } from '@/lib/db/core';
import { colleges, githubData, profiles, socialAccounts, type Profile } from '@/lib/db/schema/core';
import type { User } from '@supabase/supabase-js';
import { usernameBase, usernameCandidate } from './username';

/**
 * Generates a unique student code e.g. HM-7A9B2K
 */
export function generateStudentCode(userId: string): string {
  const hash = userId.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `HM-${hash}`;
}

/**
 * Ensures a profile exists in Neon database for a Supabase authenticated student.
 * Pulls student details from Supabase User and links via studentCode & userId.
 */
export async function ensureStudentProfile(user: User): Promise<Profile> {
  const db = getCoreDb();
  const existing = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (existing[0]) {
    // If studentCode wasn't set previously, populate it
    if (!existing[0].studentCode) {
      const code = generateStudentCode(user.id);
      const [updated] = await db
        .update(profiles)
        .set({ studentCode: code, updatedAt: new Date() })
        .where(eq(profiles.id, user.id))
        .returning();
      return updated ?? existing[0];
    }
    return existing[0];
  }

  // Create new profile linked to Supabase Auth User
  const studentCode = generateStudentCode(user.id);
  const rawFullName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    '';
  const avatarUrl =
    (user.user_metadata?.avatar_url as string) ||
    (user.user_metadata?.picture as string) ||
    null;

  const baseName = usernameBase({
    username: user.user_metadata?.user_name as string,
    email: user.email,
    userId: user.id,
  });

  let username = baseName;
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = usernameCandidate(baseName, attempt);
    const taken = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.username, candidate))
      .limit(1);
    if (!taken[0]) {
      username = candidate;
      break;
    }
  }

  const [created] = await db
    .insert(profiles)
    .values({
      id: user.id,
      studentCode,
      email: user.email ?? null,
      fullName: rawFullName || null,
      avatarUrl,
      username,
      skills: [],
      hackathonInterests: [],
      onboardingDone: false,
      isOpenToTeam: true,
      profileComplete: 10,
    })
    .returning();

  return created;
}

export interface PublicSocialAccount {
  platform: string;
  username: string | null;
  displayName: string | null;
  profileUrl: string | null;
  isVerified: boolean;
}

/**
 * Look up a student by either their Supabase ID, username, or unique Student Code (HM-XXXXXX)
 */
export async function getStudentByAnyKey(identifier: string) {
  const db = getCoreDb();
  const rows = await db
    .select({ profile: profiles, college: colleges, github: githubData })
    .from(profiles)
    .leftJoin(colleges, eq(profiles.collegeId, colleges.id))
    .leftJoin(githubData, eq(profiles.id, githubData.userId))
    .where(
      or(
        eq(profiles.id, identifier),
        eq(profiles.username, identifier.toLowerCase()),
        eq(profiles.studentCode, identifier.toUpperCase()),
      ),
    )
    .limit(1);

  if (!rows[0]) return null;

  const userSocials = await db
    .select({
      platform: socialAccounts.platform,
      username: socialAccounts.username,
      displayName: socialAccounts.displayName,
      profileUrl: socialAccounts.profileUrl,
      isVerified: socialAccounts.isVerified,
    })
    .from(socialAccounts)
    .where(eq(socialAccounts.userId, rows[0].profile.id));

  return {
    ...rows[0],
    socialAccounts: userSocials as PublicSocialAccount[],
  };
}

