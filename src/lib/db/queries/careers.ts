import { desc } from 'drizzle-orm';
import { getCoreDb } from '@/lib/db/core';
import { careerApplications, type CareerApplication } from '@/lib/db/schema/core';

export async function createCareerApplication(data: {
  userId?: string | null;
  name: string;
  email: string;
  role: string;
  portfolioUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  resumeUrl?: string | null;
  message: string;
}): Promise<CareerApplication> {
  const db = getCoreDb();
  const [app] = await db
    .insert(careerApplications)
    .values({
      userId: data.userId ?? null,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role.trim(),
      portfolioUrl: data.portfolioUrl?.trim() || null,
      githubUrl: data.githubUrl?.trim() || null,
      linkedinUrl: data.linkedinUrl?.trim() || null,
      resumeUrl: data.resumeUrl?.trim() || null,
      message: data.message.trim(),
      status: 'NEW',
    })
    .returning();

  return app;
}

export async function listCareerApplications(limit = 50): Promise<CareerApplication[]> {
  const db = getCoreDb();
  return db
    .select()
    .from(careerApplications)
    .orderBy(desc(careerApplications.createdAt))
    .limit(limit);
}
