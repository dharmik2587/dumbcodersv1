import { NextRequest } from 'next/server';
import { getOptionalUserId } from '@/lib/auth/server';
import { hasCoreDatabase } from '@/lib/db/core';
import { createCareerApplication } from '@/lib/db/queries/careers';
import { failure, success } from '@/lib/http';
import { enforceRateLimit } from '@/lib/ratelimit';
import { createCareerApplicationSchema } from '@/lib/validations/career';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!hasCoreDatabase()) {
    return failure('NOT_CONFIGURED', 'Database is not configured.', 503);
  }

  const userId = await getOptionalUserId();

  // Rate limit: 5 submissions per hour
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-ip';
  const rateLimitKey = userId ? `career:user:${userId}` : `career:ip:${clientIp}`;
  const rl = await enforceRateLimit(rateLimitKey, 5, 3600);
  if (!rl.success && rl.response) {
    return rl.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure('INVALID_JSON', 'Malformed JSON payload.', 400);
  }

  const parsed = createCareerApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return failure(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid application submission.',
      400,
      { details: parsed.error.issues }
    );
  }

  try {
    const app = await createCareerApplication({
      userId,
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      portfolioUrl: parsed.data.portfolioUrl || null,
      githubUrl: parsed.data.githubUrl || null,
      linkedinUrl: parsed.data.linkedinUrl || null,
      resumeUrl: parsed.data.resumeUrl || null,
      message: parsed.data.message,
    });

    return success(
      {
        id: app.id,
        status: app.status,
        message: 'Application received! The HackMate student maintainers will review your profile and reach out.',
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/careers failed:', err);
    return failure('DATABASE_ERROR', 'Could not save the application. Please try again.', 500);
  }
}
