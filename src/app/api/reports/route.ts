import { NextRequest } from 'next/server';
import { getOptionalUserId } from '@/lib/auth/server';
import { hasCoreDatabase } from '@/lib/db/core';
import { createProblemReport } from '@/lib/db/queries/reports';
import { failure, success } from '@/lib/http';
import { enforceRateLimit } from '@/lib/ratelimit';
import { createReportSchema } from '@/lib/validations/report';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!hasCoreDatabase()) {
    return failure('NOT_CONFIGURED', 'Database is not configured.', 503);
  }

  // Get optional user ID (guest reporting is supported)
  const userId = await getOptionalUserId();

  // Rate limiting by IP or user ID: 5 reports per minute
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-ip';
  const rateLimitKey = userId ? `report:user:${userId}` : `report:ip:${clientIp}`;
  const rl = await enforceRateLimit(rateLimitKey, 5, 60);
  if (!rl.success && rl.response) {
    return rl.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure('INVALID_JSON', 'Malformed JSON payload.', 400);
  }

  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) {
    return failure(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid report submission.',
      400,
      { details: parsed.error.issues }
    );
  }

  try {
    const userAgent = request.headers.get('user-agent') || parsed.data.userAgent || null;
    const report = await createProblemReport({
      userId,
      email: parsed.data.email || null,
      category: parsed.data.category,
      description: parsed.data.description,
      pageUrl: parsed.data.pageUrl || null,
      userAgent,
    });

    return success(
      {
        id: report.id,
        status: report.status,
        message: 'Problem report submitted successfully. Thank you for helping us improve HackMate!',
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/reports failed:', err);
    return failure('DATABASE_ERROR', 'Could not save the problem report. Please try again.', 500);
  }
}
