import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth/server';
import { createProject, listProjectsForTeam } from '@/lib/db/queries/projects';
import { failure, success } from '@/lib/http';
import { enforceRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }

  const rl = await enforceRateLimit(`project-create:${userId}`, 10, 60);
  if (!rl.success && rl.response) return rl.response;

  try {
    const body = await req.json();
    const { teamId, name, description } = body;

    if (!teamId || !name) {
      return failure('BAD_REQUEST', 'Team ID and Name are required.', 400);
    }

    const project = await createProject(teamId, name, description, userId);
    return success(project);
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return failure('FORBIDDEN', error.message, 403);
    }
    return failure('INTERNAL_ERROR', error.message || 'Failed to create project', 500);
  }
}

export async function GET(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }

  const url = new URL(req.url);
  const teamId = url.searchParams.get('teamId');

  if (!teamId) return failure('BAD_REQUEST', 'Missing teamId', 400);

  try {
    const projects = await listProjectsForTeam(teamId, userId);
    return success(projects);
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return failure('FORBIDDEN', error.message, 403);
    }
    return failure('INTERNAL_ERROR', error.message || 'Failed to list projects', 500);
  }
}
