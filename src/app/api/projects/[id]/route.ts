import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth/server';
import { getProjectById } from '@/lib/db/queries/projects';
import { failure, success } from '@/lib/http';
import { getCoreDb } from '@/lib/db/core';
import { projects, teamMembers } from '@/lib/db/schema/core';
import { and, eq } from 'drizzle-orm';
import { enforceRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }

  try {
    const id = (await params).id;
    const data = await getProjectById(id, userId);
    if (!data) return failure('NOT_FOUND', 'Project not found', 404);
    
    return success(data);
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return failure('FORBIDDEN', error.message, 403);
    }
    return failure('INTERNAL_ERROR', error.message || 'Failed to get project', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }

  const rl = await enforceRateLimit(`project-update:${userId}`, 20, 60);
  if (!rl.success && rl.response) return rl.response;

  try {
    const id = (await params).id;
    const db = getCoreDb();
    
    // Check project and ownership via team member
    const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!project) return failure('NOT_FOUND', 'Project not found', 404);

    const [member] = await db.select().from(teamMembers).where(and(eq(teamMembers.teamId, project.teamId), eq(teamMembers.userId, userId))).limit(1);
    if (!member) return failure('FORBIDDEN', 'Must be a team member to edit', 403);

    const body = await req.json();
    const { name, description } = body;

    const [updated] = await db.update(projects)
      .set({ name, description, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    return success(updated);
  } catch (error: any) {
    return failure('INTERNAL_ERROR', error.message || 'Failed to update project', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return failure('UNAUTHORIZED', 'Sign in to continue.', 401); }

  try {
    const id = (await params).id;
    const db = getCoreDb();
    
    const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!project) return failure('NOT_FOUND', 'Project not found', 404);

    const [member] = await db.select().from(teamMembers).where(and(eq(teamMembers.teamId, project.teamId), eq(teamMembers.userId, userId))).limit(1);
    // Ideally check if leader, but any member for now to keep it simple, or checking leader if preferred.
    if (!member) return failure('FORBIDDEN', 'Must be a team member to delete', 403);

    await db.delete(projects).where(eq(projects.id, id));
    return success({ deleted: true });
  } catch (error: any) {
    return failure('INTERNAL_ERROR', error.message || 'Failed to delete project', 500);
  }
}
