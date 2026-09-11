import { requireUser } from '@/lib/auth/server';
import { failure, success } from '@/lib/http';
import { syncUserSocialIdentities, listSocialAccounts } from '@/lib/db/queries/social-accounts';

export const runtime = 'nodejs';

/**
 * POST /api/profile/social-accounts/sync
 * Sync current Supabase user's OAuth identities into social_accounts table.
 */
export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return failure('UNAUTHORIZED', 'Sign in to continue.', 401);
  }

  try {
    await syncUserSocialIdentities(user);
    const accounts = await listSocialAccounts(user.id);
    return success(accounts);
  } catch (error) {
    console.error('POST /api/profile/social-accounts/sync failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to sync identities';
    return failure('INTERNAL_ERROR', msg, 500);
  }
}
