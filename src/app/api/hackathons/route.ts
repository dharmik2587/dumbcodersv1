import { NextRequest } from 'next/server';
import { hasCoreDatabase } from '@/lib/db/core';
import { listHackathons } from '@/lib/db/queries/hackathons';
import { failure, success } from '@/lib/http';
import { hackathonListQuerySchema } from '@/lib/validations/hackathon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);
  const parsed = hackathonListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return failure('VALIDATION_ERROR', 'Invalid hackathon filters.', 400);

  try {
    const result = await listHackathons(parsed.data);
    return success({
      data: result.rows,
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        hasMore: result.page * result.pageSize < result.total,
      },
    });
  } catch (error) {
    console.error('GET /api/hackathons failed', error);
    return failure('DATABASE_ERROR', 'Could not load hackathons.', 500);
  }
}
