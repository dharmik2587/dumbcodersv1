import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth/server';
import { createProject, listProjectsForTeam } from '@/lib/db/queries/projects';
import { failure, success } from '@/lib/http';
import { enforceRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

import { withApiHandler } from '@/lib/api/with-api-handler';
import { AppError } from '@/lib/api/errors';

export const POST = withApiHandler(
  { api: 'projects', operation: 'createProject', requireAuth: true },
  async ({ req, userId }) => {
    const rl = await enforceRateLimit(`project-create:${userId}`, 10, 60);
    if (!rl.success && rl.response) return rl.response;

    const body = await req.json();
    const { teamId, name, description } = body;

    if (!teamId || !name) {
      return failure('BAD_REQUEST', 'Team ID and Name are required.', 400);
    }

    try {
      const project = await createProject(teamId, name, description, userId!);
      return success(project);
    } catch (error: any) {
      if (error.message?.includes('Unauthorized')) {
        throw new AppError('You do not have permission to perform this action.', { code: 'FORBIDDEN', statusCode: 403 });
      }
      throw error;
    }
  }
);

export const GET = withApiHandler(
  { api: 'projects', requireAuth: true },
  async ({ req, userId }) => {
    const url = new URL(req.url);
    const teamId = url.searchParams.get('teamId');

    if (!teamId) return failure('BAD_REQUEST', 'Missing teamId', 400);

    try {
      const projects = await listProjectsForTeam(teamId, userId!);
      return success(projects);
    } catch (error: any) {
      if (error.message?.includes('Unauthorized')) {
        throw new AppError('You do not have permission to view these projects.', { code: 'FORBIDDEN', statusCode: 403 });
      }
      throw error;
    }
  }
);
