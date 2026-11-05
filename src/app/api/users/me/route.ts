import { NextRequest } from 'next/server';
import { getOptionalUser, requireUser } from '@/lib/auth/server';
import { hasCoreDatabase } from '@/lib/db/core';
import { getFullProfileById, ProfileConflictError, updateProfile } from '@/lib/db/queries/profiles';
import { ensureStudentProfile } from '@/lib/profile/student';
import { failure, success } from '@/lib/http';
import { profileUpdateSchema } from '@/lib/validations/profile';
import { enforceRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getOptionalUser();
  if (!user) return failure('UNAUTHORIZED', 'Sign in to continue.', 401);
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  try {
    await ensureStudentProfile(user);
    const profile = await getFullProfileById(user.id);
    return success(profile);
  } catch (error: unknown) {
    console.error('GET /api/users/me failed', error);
    return failure('DATABASE_ERROR', 'Could not load your profile.', 500);
  }
}

export async function PATCH(request: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return failure('UNAUTHORIZED', 'Sign in to continue.', 401);
  }

  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  const rl = await enforceRateLimit(`profile-edit:${user.id}`, 20, 60);
  if (!rl.success && rl.response) return rl.response;

  const body = await request.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return failure('VALIDATION_ERROR', `Profile data is invalid: ${issues.join('; ')}`, 400);
  }

  try {
    // Ensure profile row exists in Neon database before patching
    await ensureStudentProfile(user);

    const updated = await updateProfile(user.id, parsed.data);
    if (!updated) return failure('PROFILE_NOT_FOUND', 'Profile could not be updated.', 404);
    return success(updated);
  } catch (error: unknown) {
    if (error instanceof ProfileConflictError) {
      return failure('CONFLICT', error.message, 409);
    }
    // Log the real cause server-side; never echo database internals to the browser.
    console.error('PATCH /api/users/me failed:', error);
    return failure('DATABASE_ERROR', 'Could not save your profile right now. Please try again.', 500);
  }
}
