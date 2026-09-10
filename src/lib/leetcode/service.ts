import crypto from 'crypto';

const LEETCODE_GRAPHQL = 'https://leetcode.com/graphql';

export interface LeetcodePublicProfile {
  username: string;
  realName?: string | null;
  aboutMe?: string | null;
  userAvatar?: string | null;
  ranking?: number | null;
  websites?: string[];
  skillTags?: string[];
  githubUrl?: string | null;
  twitterUrl?: string | null;
  linkedinUrl?: string | null;
}

export interface LeetcodeStats {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  ranking: number | null;
  contestRating: number | null;
  contestsAttended: number;
}

const PROFILE_QUERY = `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      githubUrl
      twitterUrl
      linkedinUrl
      profile {
        aboutMe
        ranking
        userAvatar
        realName
        websites
        skillTags
      }
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
    userContestRanking(username: $username) {
      rating
      attendedContestsCount
    }
  }
`;

/**
 * Validates LeetCode username format according to platform rules.
 * 1-64 characters, alphanumeric plus underscores and hyphens.
 */
export function validateLeetcodeUsername(username: unknown): { valid: boolean; error?: string; cleanUsername?: string } {
  if (typeof username !== 'string') {
    return { valid: false, error: 'Username must be a string' };
  }
  const clean = username.trim();
  if (clean.length < 1 || clean.length > 64) {
    return { valid: false, error: 'Username must be between 1 and 64 characters' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    return { valid: false, error: 'Username contains invalid characters (letters, numbers, hyphens, and underscores only)' };
  }
  return { valid: true, cleanUsername: clean };
}

/**
 * Generates a cryptographically secure random verification code.
 * Format: HM-XXXXXX (6 uppercase alphanumeric characters)
 */
export function generateVerificationCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32-like without ambiguous 0/O, 1/I
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `HM-${code}`;
}

/**
 * Fetch a LeetCode user's full public profile.
 * Returns null if the user does not exist.
 */
export async function fetchLeetcodePublicProfile(username: string): Promise<LeetcodePublicProfile | null> {
  const response = await fetch(LEETCODE_GRAPHQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer': 'https://leetcode.com',
      'User-Agent': 'HackMate/1.0',
    },
    body: JSON.stringify({
      query: PROFILE_QUERY,
      variables: { username },
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`LeetCode API returned ${response.status}`);
  }

  const json = await response.json();

  if (!json.data?.matchedUser) {
    return null;
  }

  const user = json.data.matchedUser;
  return parseLeetcodeProfile(user);
}

/**
 * Parses raw LeetCode GraphQL matchedUser response into a clean LeetcodePublicProfile.
 */
export interface RawLeetcodeMatchedUser {
  username: string;
  githubUrl?: string | null;
  twitterUrl?: string | null;
  linkedinUrl?: string | null;
  profile?: {
    realName?: string | null;
    aboutMe?: string | null;
    userAvatar?: string | null;
    ranking?: number | null;
    websites?: string[];
    skillTags?: string[];
  };
  submitStatsGlobal?: {
    acSubmissionNum?: Array<{ difficulty: string; count: number }>;
  };
}

export function parseLeetcodeProfile(matchedUser: RawLeetcodeMatchedUser): LeetcodePublicProfile {
  return {
    username: matchedUser.username,
    realName: matchedUser.profile?.realName ?? null,
    aboutMe: matchedUser.profile?.aboutMe ?? null,
    userAvatar: matchedUser.profile?.userAvatar ?? null,
    ranking: matchedUser.profile?.ranking ?? null,
    websites: Array.isArray(matchedUser.profile?.websites) ? matchedUser.profile.websites : [],
    skillTags: Array.isArray(matchedUser.profile?.skillTags) ? matchedUser.profile.skillTags : [],
    githubUrl: matchedUser.githubUrl ?? null,
    twitterUrl: matchedUser.twitterUrl ?? null,
    linkedinUrl: matchedUser.linkedinUrl ?? null,
  };
}

/**
 * Inspects all public fields of a LeetCode profile to check if the verification code is present.
 */
export function verifyCodeInProfile(profile: LeetcodePublicProfile, code: string): boolean {
  if (!code) return false;
  const target = code.trim().toUpperCase();

  const searchableTexts: string[] = [
    profile.aboutMe || '',
    profile.realName || '',
    profile.githubUrl || '',
    profile.twitterUrl || '',
    profile.linkedinUrl || '',
    ...(profile.websites || []),
    ...(profile.skillTags || []),
  ];

  return searchableTexts.some((text) => text.toUpperCase().includes(target));
}

/**
 * Fetch and parse a LeetCode user's problem solving and contest statistics.
 */
export async function fetchLeetcodeStats(username: string): Promise<LeetcodeStats | null> {
  const response = await fetch(LEETCODE_GRAPHQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer': 'https://leetcode.com',
      'User-Agent': 'HackMate/1.0',
    },
    body: JSON.stringify({
      query: PROFILE_QUERY,
      variables: { username },
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`LeetCode API returned ${response.status}`);
  }

  const json = await response.json();

  if (!json.data?.matchedUser) {
    return null;
  }

  return parseLeetcodeStats(json.data);
}

/**
 * Parses raw LeetCode GraphQL data object into LeetcodeStats.
 */
export interface RawLeetcodeStatsData {
  matchedUser: RawLeetcodeMatchedUser;
  userContestRanking?: {
    rating?: number | null;
    attendedContestsCount?: number | null;
    globalRanking?: number | null;
  } | null;
}

export function parseLeetcodeStats(data: RawLeetcodeStatsData): LeetcodeStats {
  const user = data.matchedUser;
  const submissions: Array<{ difficulty: string; count: number }> =
    user.submitStatsGlobal?.acSubmissionNum ?? [];

  const bySeverity = (d: string) => submissions.find((s) => s.difficulty === d)?.count ?? 0;
  const contestRanking = data.userContestRanking;

  return {
    username: user.username,
    totalSolved: bySeverity('All'),
    easySolved: bySeverity('Easy'),
    mediumSolved: bySeverity('Medium'),
    hardSolved: bySeverity('Hard'),
    ranking: user.profile?.ranking ?? null,
    contestRating: contestRanking?.rating ? Math.round(contestRanking.rating) : null,
    contestsAttended: contestRanking?.attendedContestsCount ?? 0,
  };
}
