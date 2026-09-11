import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth/server';
import { failure, success } from '@/lib/http';
import { deleteSocialAccount } from '@/lib/db/queries/social-accounts';

export const runtime = 'nodejs';

/**
 * DELETE /api/profile/social-accounts/[id]
 * Remove a social account owned by the user.
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return failure('UNAUTHORIZED', 'Sign in to continue.', 401);
  }

  const { id } = await context.params;
  if (!id) {
    return failure('BAD_REQUEST', 'Missing social account id.', 400);
  }

  try {
    const deleted = await deleteSocialAccount(userId, id);
    if (!deleted) {
      return failure('NOT_FOUND', 'Social account not found or not owned by you.', 404);
    }

    return success({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/profile/social-accounts/[id] failed:', error);
    return failure('INTERNAL_ERROR', 'Failed to disconnect social account.', 500);
  }
}
