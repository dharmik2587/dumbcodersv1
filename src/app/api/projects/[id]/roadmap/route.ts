import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth/server';
import { getProjectById, updateRoadmapStep, upsertRoadmap } from '@/lib/db/queries/projects';
import { failure, success } from '@/lib/http';
import { enforceRateLimit } from '@/lib/ratelimit';
import { generateRoadmap } from '@/lib/ai/generate';
import { getCoreDb } from '@/lib/db/core';
import { teamMembers, profiles } from '@/lib/db/schema/core';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }

  const rl = await enforceRateLimit(`roadmap-gen:${userId}`, 5, 10 * 60); // 5 per 10 mins
  if (!rl.success && rl.response) return rl.response;

  try {
    const id = (await params).id;
    const data = await getProjectById(id, userId);
    if (!data) return failure('NOT_FOUND', 'Project not found', 404);

    const db = getCoreDb();
    
    // Fetch team members with roles to inform the AI
    const members = await db.select({
      role: teamMembers.role,
      name: profiles.fullName,
    })
    .from(teamMembers)
    .leftJoin(profiles, eq(teamMembers.userId, profiles.id))
    .where(eq(teamMembers.teamId, data.project.teamId));

    const roles = members.map(m => m.role).filter(Boolean) as string[];

    // Generate AI roadmap
    const steps = await generateRoadmap(data.project.name, data.project.description || '', roles);

    // Save to DB
    const roadmap = await upsertRoadmap(id, steps, 'gpt-4o-mini');

    return success(roadmap);
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return failure('FORBIDDEN', error.message, 403);
    }
    return failure('INTERNAL_ERROR', error.message || 'Failed to generate roadmap', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }

  try {
    const id = (await params).id;
    const data = await getProjectById(id, userId); // verifies membership
    if (!data) return failure('NOT_FOUND', 'Project not found', 404);

    const body = await req.json();
    const { stepId, done } = body;

    if (!stepId || typeof done !== 'boolean') {
      return failure('BAD_REQUEST', 'Missing stepId or done status', 400);
    }

    const updated = await updateRoadmapStep(id, stepId, done);
    return success(updated);
  } catch (error: any) {
    return failure('INTERNAL_ERROR', error.message || 'Failed to update step', 500);
  }
}
