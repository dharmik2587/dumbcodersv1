import { and, eq, ilike, or } from 'drizzle-orm';
import { getCoreDb } from '@/lib/db/core';
import { colleges, githubData, profiles } from '@/lib/db/schema/core';
import type { ProfileUpdate } from '@/lib/validations/profile';
import { calculateProfileComplete } from '@/lib/profile/completion';

export async function getProfileById(id: string) {
  const db = getCoreDb();
  const rows = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getFullProfileById(id: string) {
  const db = getCoreDb();
  const rows = await db
    .select({ profile: profiles, college: colleges, github: githubData })
    .from(profiles)
    .leftJoin(colleges, eq(profiles.collegeId, colleges.id))
    .leftJoin(githubData, eq(profiles.id, githubData.userId))
    .where(eq(profiles.id, id))
    .limit(1);

  if (!rows[0]) return null;
  const { profile, college, github } = rows[0];
  return {
    ...profile,
    college: college ? { id: college.id, name: college.name, shortName: college.shortName } : null,
    github: github ?? null,
  };
}

export async function getProfileByUsername(username: string) {
  const db = getCoreDb();
  const rows = await db
    .select({ profile: profiles, college: colleges, github: githubData })
    .from(profiles)
    .leftJoin(colleges, eq(profiles.collegeId, colleges.id))
    .leftJoin(githubData, eq(profiles.id, githubData.userId))
    .where(eq(profiles.username, username))
    .limit(1);

  return rows[0] ?? null;
}

export async function findOrCreateCollege(collegeName: string) {
  const db = getCoreDb();
  const trimmed = collegeName.trim();
  if (!trimmed) return null;

  // 1. Try to find existing college by name or shortName
  const existing = await db
    .select()
    .from(colleges)
    .where(
      or(
        ilike(colleges.name, trimmed),
        ilike(colleges.shortName, trimmed),
        ilike(colleges.domain, `%${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '')}%`)
      )
    )
    .limit(1);

  if (existing[0]) return existing[0];

  // 2. Insert new college if not found
  const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const domain = `${slug || 'campus'}.edu`;
  try {
    const [created] = await db
      .insert(colleges)
      .values({
        name: trimmed,
        shortName: trimmed.length <= 15 ? trimmed : trimmed.split(' ').map((w) => w[0]).join('').toUpperCase(),
        domain,
      })
      .onConflictDoNothing()
      .returning();

    if (created) return created;
  } catch {
    // on conflict fallback
  }

  const fallback = await db.select().from(colleges).where(ilike(colleges.name, trimmed)).limit(1);
  return fallback[0] ?? null;
}

export async function updateProfile(id: string, patch: ProfileUpdate) {
  const db = getCoreDb();
  const current = await getProfileById(id);
  if (!current) return null;

  // Handle college resolution if college or collegeName provided
  let collegeId = patch.collegeId;
  const rawCollegeName = patch.college || patch.collegeName;
  if (!collegeId && rawCollegeName) {
    const col = await findOrCreateCollege(rawCollegeName);
    if (col) {
      collegeId = col.id;
    }
  }

  // Strip non-column fields before updating profiles table
  const { college: _c, collegeName: _cn, ...profileFields } = patch;
  const updateData = {
    ...profileFields,
    ...(collegeId !== undefined ? { collegeId } : {}),
  };

  const nextProfile = { ...current, ...updateData };
  const profileComplete = calculateProfileComplete(nextProfile);
  const [updated] = await db
    .update(profiles)
    .set({
      ...updateData,
      profileComplete,
      updatedAt: new Date(),
    })
    .where(and(eq(profiles.id, id)))
    .returning();

  if (!updated) return null;

  // Return full profile joined with college
  return await getFullProfileById(id);
}

export async function findCollegeByDomain(domain: string) {
  const db = getCoreDb();
  const rows = await db
    .select()
    .from(colleges)
    .where(eq(colleges.domain, domain.toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}
