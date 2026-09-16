import { and, eq, desc } from 'drizzle-orm';
import { getCoreDb } from '../core';
import { projectRoadmaps, projects, teamMembers, teams } from '../schema/core';

export async function createProject(teamId: string, name: string, description: string | undefined, userId: string) {
  const db = getCoreDb();
  
  // Verify team membership
  const member = await db.select().from(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))).limit(1);
  if (!member[0]) {
    throw new Error('Unauthorized: Must be a team member to create a project');
  }

  const [project] = await db.insert(projects).values({
    teamId,
    name,
    description,
    createdBy: userId,
  }).returning();

  return project;
}

export async function getProjectById(projectId: string, userId: string) {
  const db = getCoreDb();
  
  // Get project
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return null;

  // Verify team membership
  const member = await db.select().from(teamMembers).where(and(eq(teamMembers.teamId, project.teamId), eq(teamMembers.userId, userId))).limit(1);
  if (!member[0]) {
    throw new Error('Unauthorized: Must be a team member to view this project');
  }

  // Get latest roadmap
  const [roadmap] = await db
    .select()
    .from(projectRoadmaps)
    .where(eq(projectRoadmaps.projectId, projectId))
    .orderBy(desc(projectRoadmaps.createdAt))
    .limit(1);

  return { project, roadmap };
}

export async function listProjectsForTeam(teamId: string, userId: string) {
  const db = getCoreDb();
  
  // Verify team membership
  const member = await db.select().from(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))).limit(1);
  if (!member[0]) {
    throw new Error('Unauthorized: Must be a team member to list projects');
  }

  return db.select().from(projects).where(eq(projects.teamId, teamId)).orderBy(projects.createdAt);
}

export async function upsertRoadmap(projectId: string, steps: Array<{ id: string; label: string; done: boolean; order: number }>, model: string) {
  const db = getCoreDb();
  
  // Check if existing roadmap
  const [existing] = await db.select().from(projectRoadmaps).where(eq(projectRoadmaps.projectId, projectId)).orderBy(desc(projectRoadmaps.createdAt)).limit(1);

  if (existing) {
    const [updated] = await db.update(projectRoadmaps).set({
      steps,
      generatedBy: model,
      generatedAt: new Date(),
      version: existing.version + 1,
      updatedAt: new Date(),
    }).where(eq(projectRoadmaps.id, existing.id)).returning();
    return updated;
  } else {
    const [created] = await db.insert(projectRoadmaps).values({
      projectId,
      steps,
      generatedBy: model,
      generatedAt: new Date(),
      version: 1,
    }).returning();
    return created;
  }
}

export async function updateRoadmapStep(projectId: string, stepId: string, done: boolean) {
  const db = getCoreDb();
  const [existing] = await db.select().from(projectRoadmaps).where(eq(projectRoadmaps.projectId, projectId)).orderBy(desc(projectRoadmaps.createdAt)).limit(1);
  
  if (!existing) throw new Error('Roadmap not found');

  const newSteps = existing.steps.map(s => s.id === stepId ? { ...s, done } : s);
  
  const [updated] = await db.update(projectRoadmaps)
    .set({ steps: newSteps, updatedAt: new Date() })
    .where(eq(projectRoadmaps.id, existing.id))
    .returning();
    
  return updated;
}
