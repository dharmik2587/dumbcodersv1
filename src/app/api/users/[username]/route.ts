import { hasCoreDatabase } from '@/lib/db/core';
import { getStudentByAnyKey } from '@/lib/profile/student';
import { failure, success } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  const { username } = await params;
  const rawKey = username.trim();

  try {
    const result = await getStudentByAnyKey(rawKey);
    if (!result) return failure('NOT_FOUND', 'Profile not found.', 404);

    return success({
      ...result.profile,
      college: result.college,
      github: result.github,
      socialAccounts: result.socialAccounts ?? [],
    });
  } catch (error) {
    console.error('GET /api/users/[username] failed', error);
    return failure('DATABASE_ERROR', 'Could not load the profile.', 500);
  }
}
