import { desc, eq } from 'drizzle-orm';
import { requireUserId } from '@/lib/auth/server';
import { getCoreDb, hasCoreDatabase } from '@/lib/db/core';
import { hackathonBookmarks, hackathons } from '@/lib/db/schema/core';
import { failure, success } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET() {
  let userId: string;
  try { userId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  try {
    const db = getCoreDb();
    const rows = await db.select({ hackathon: hackathons, bookmarkedAt: hackathonBookmarks.createdAt }).from(hackathonBookmarks).innerJoin(hackathons, eq(hackathonBookmarks.hackathonId, hackathons.id)).where(eq(hackathonBookmarks.userId, userId)).orderBy(desc(hackathonBookmarks.createdAt));
    return success(rows);
  } catch {
    return failure('INTERNAL_ERROR', 'Failed to load bookmarks.', 500);
  }
}
