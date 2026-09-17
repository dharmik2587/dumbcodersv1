import { NextRequest } from 'next/server';
import { getOptionalUserId } from '@/lib/auth/server';
import { hasCoreDatabase } from '@/lib/db/core';
import { searchPartners } from '@/lib/db/queries/partners';
import { failure, success } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const currentUserId = await getOptionalUserId();
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(params.get('pageSize') ?? 12)));
  if (!Number.isInteger(page) || !Number.isInteger(pageSize)) return failure('VALIDATION_ERROR', 'Invalid pagination.', 400);

  try {
    const result = await searchPartners({
      currentUserId,
      q: params.get('q') ?? undefined,
      skill: params.get('skill') ?? undefined,
      collegeId: params.get('collegeId') ?? undefined,
      role: params.get('role') ?? undefined,
      teamId: params.get('teamId') ?? undefined,
      page,
      pageSize,
    });
    return success({ data: result.rows, meta: { page, pageSize, total: result.total, hasMore: page * pageSize < result.total } });
  } catch (error) {
    console.error('GET /api/users/search failed', error);
    return failure('DATABASE_ERROR', 'Could not search partners.', 500);
  }
}
