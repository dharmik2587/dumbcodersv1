import { desc, eq } from 'drizzle-orm';
import { getCoreDb } from '@/lib/db/core';
import { problemReports, type NewProblemReport, type ProblemReport } from '@/lib/db/schema/core';

export async function createProblemReport(data: {
  userId?: string | null;
  email?: string | null;
  category: string;
  description: string;
  pageUrl?: string | null;
  userAgent?: string | null;
}): Promise<ProblemReport> {
  const db = getCoreDb();
  const [report] = await db
    .insert(problemReports)
    .values({
      userId: data.userId ?? null,
      email: data.email?.trim() || null,
      category: data.category,
      description: data.description.trim(),
      pageUrl: data.pageUrl?.trim() || null,
      userAgent: data.userAgent?.trim() || null,
      status: 'OPEN',
      priority: 'MEDIUM',
    })
    .returning();

  return report;
}

export async function listProblemReports(limit = 50): Promise<ProblemReport[]> {
  const db = getCoreDb();
  return db
    .select()
    .from(problemReports)
    .orderBy(desc(problemReports.createdAt))
    .limit(limit);
}
