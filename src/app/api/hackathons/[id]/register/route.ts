import { NextRequest, NextResponse } from 'next/server';
import { hasCoreDatabase } from '@/lib/db/core';
import { getHackathonById } from '@/lib/db/queries/hackathons';
import { failure } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasCoreDatabase()) return failure('NOT_CONFIGURED', 'Database is not configured.', 503);
  const { id } = await params;

  try {
    const hackathon = await getHackathonById(id);
    if (!hackathon) return failure('NOT_FOUND', 'Hackathon not found.', 404);

    const targetUrl = hackathon.registrationUrl || hackathon.sourceUrl;
    if (!targetUrl) return failure('NOT_FOUND', 'No registration URL available for this hackathon.', 404);

    try {
      const parsedUrl = new URL(targetUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return failure('BAD_REQUEST', 'Invalid registration URL scheme.', 400);
      }
    } catch (e) {
      return failure('BAD_REQUEST', 'Malformed registration URL.', 400);
    }

    return NextResponse.redirect(targetUrl, 302);
  } catch (error) {
    console.error('GET /api/hackathons/[id]/register failed', error);
    return failure('SERVER_ERROR', 'Could not process registration redirect.', 500);
  }
}
