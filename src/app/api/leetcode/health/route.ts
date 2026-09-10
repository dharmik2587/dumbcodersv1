import { NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { hasCoreDatabase, getCoreDb } from '@/lib/db/core';
import {
  validateLeetcodeUsername,
  generateVerificationCode,
  fetchLeetcodePublicProfile,
  parseLeetcodeProfile,
  verifyCodeInProfile,
  fetchLeetcodeStats,
  parseLeetcodeStats,
} from '@/lib/leetcode/service';

export const runtime = 'nodejs';

/**
 * GET /api/leetcode/health
 * 
 * Comprehensive developer & admin health check that tests all components:
 * 1. Database connection
 * 2. Connected accounts table existence
 * 3. Verification code generator
 * 4. Username validation
 * 5. LeetCode public profile request & parser
 * 6. Verification code detection logic
 * 7. Statistics retrieval & parser
 * 
 * Returns HTTP 200 only if all required checks PASS.
 * Returns HTTP 500 / 503 if any required check fails.
 */
export async function GET(request: NextRequest) {
  const checks: Record<string, { status: 'PASS' | 'FAIL' | 'SKIPPED'; http_code?: number; error?: string; reason?: string }> = {};
  let overallHealthy = true;

  // 1. Database connection check
  if (!hasCoreDatabase()) {
    checks.database = { status: 'FAIL', http_code: 503, error: 'CORE_DATABASE_URL not configured' };
    overallHealthy = false;
  } else {
    try {
      const db = getCoreDb();
      await db.execute(sql`SELECT 1`);
      checks.database = { status: 'PASS', http_code: 200 };
    } catch (e: unknown) {
      checks.database = { status: 'FAIL', http_code: 500, error: e instanceof Error ? e.message : 'Database query failed' };
      overallHealthy = false;
    }
  }

  // 2. Connected account table check
  if (checks.database?.status === 'PASS') {
    try {
      const db = getCoreDb();
      await db.execute(sql`SELECT count(*) FROM connected_accounts LIMIT 1`);
      checks.account_table = { status: 'PASS', http_code: 200 };
    } catch (e: unknown) {
      checks.account_table = { status: 'FAIL', http_code: 500, error: e instanceof Error ? e.message : 'Table check failed' };
      overallHealthy = false;
    }
  } else {
    checks.account_table = { status: 'SKIPPED', reason: 'Database check failed' };
  }

  // 3. Verification code generation check
  try {
    const code = generateVerificationCode();
    if (code && code.startsWith('HM-') && code.length === 9) {
      checks.code_generation = { status: 'PASS', http_code: 200 };
    } else {
      checks.code_generation = { status: 'FAIL', http_code: 500, error: 'Generated code format is invalid' };
      overallHealthy = false;
    }
  } catch (e: unknown) {
    checks.code_generation = { status: 'FAIL', http_code: 500, error: e instanceof Error ? e.message : 'Code generation error' };
    overallHealthy = false;
  }

  // 4. Username validation check
  try {
    const validCheck = validateLeetcodeUsername('tourist');
    const invalidCheck = validateLeetcodeUsername('bad user@name!');
    if (validCheck.valid && !invalidCheck.valid) {
      checks.username_validation = { status: 'PASS', http_code: 200 };
    } else {
      checks.username_validation = { status: 'FAIL', http_code: 500, error: 'Validation logic produced unexpected results' };
      overallHealthy = false;
    }
  } catch (e: unknown) {
    checks.username_validation = { status: 'FAIL', http_code: 500, error: e instanceof Error ? e.message : 'Validation error' };
    overallHealthy = false;
  }

  // 5. Public LeetCode profile request check
  let profileSample: { username?: string } | null = null;
  try {
    profileSample = await fetchLeetcodePublicProfile('tourist');
    if (profileSample && profileSample.username) {
      checks.leetcode_profile_request = { status: 'PASS', http_code: 200 };
    } else {
      checks.leetcode_profile_request = { status: 'FAIL', http_code: 502, error: 'Could not resolve standard profile' };
      overallHealthy = false;
    }
  } catch (e: unknown) {
    checks.leetcode_profile_request = { status: 'FAIL', http_code: 503, error: e instanceof Error ? e.message : 'LeetCode API unreachable' };
    overallHealthy = false;
  }

  // 6. Profile parser check
  try {
    const parsed = parseLeetcodeProfile({
      username: 'test_user',
      profile: { aboutMe: 'Testing HM-123456 code', ranking: 100 },
    });
    if (parsed.username === 'test_user' && parsed.aboutMe?.includes('HM-123456')) {
      checks.profile_parser = { status: 'PASS', http_code: 200 };
    } else {
      checks.profile_parser = { status: 'FAIL', http_code: 500, error: 'Profile parser failed to map fields' };
      overallHealthy = false;
    }
  } catch (e: unknown) {
    checks.profile_parser = { status: 'FAIL', http_code: 500, error: e instanceof Error ? e.message : 'Parser error' };
    overallHealthy = false;
  }

  // 7. Verification code detection check
  try {
    const testProfile = {
      username: 'test_user',
      aboutMe: 'My verification token is HM-ABC123 for Hackmate',
    };
    const found = verifyCodeInProfile(testProfile, 'HM-ABC123');
    const notFound = verifyCodeInProfile(testProfile, 'HM-WRONG1');
    if (found && !notFound) {
      checks.verification = { status: 'PASS', http_code: 200 };
    } else {
      checks.verification = { status: 'FAIL', http_code: 500, error: 'Code detection logic failed' };
      overallHealthy = false;
    }
  } catch (e: unknown) {
    checks.verification = { status: 'FAIL', http_code: 500, error: e instanceof Error ? e.message : 'Verification check error' };
    overallHealthy = false;
  }

  // 8. Stats retrieval and parsing check
  try {
    const stats = await fetchLeetcodeStats('tourist');
    if (stats && typeof stats.totalSolved === 'number') {
      checks.stats = { status: 'PASS', http_code: 200 };
    } else {
      checks.stats = { status: 'FAIL', http_code: 502, error: 'Failed to retrieve stats for sample user' };
      overallHealthy = false;
    }
  } catch (e: unknown) {
    checks.stats = { status: 'FAIL', http_code: 503, error: e instanceof Error ? e.message : 'Stats retrieval error' };
    overallHealthy = false;
  }

  const responsePayload = {
    success: overallHealthy,
    status: overallHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  };

  return Response.json(responsePayload, { status: overallHealthy ? 200 : 503 });
}
