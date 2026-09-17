import { and, count, eq, ilike, not, or, sql } from 'drizzle-orm';
import { getCoreDb } from '@/lib/db/core';
import { colleges, githubData, profiles, teamMembers, teams } from '@/lib/db/schema/core';
import { compatibilityScore, type TeamContext } from '@/lib/compatibility';

const TEAM_ROLES = ['frontend', 'backend', 'ml', 'design', 'pitch'];

/** Returns the roles a team is still missing, based on member roles + `rolesNeeded`. */
export async function getTeamMissingRoles(teamId: string): Promise<string[]> {
  const db = getCoreDb();
  const [team, members] = await Promise.all([
    db.select({ rolesNeeded: teams.rolesNeeded }).from(teams).where(eq(teams.id, teamId)).limit(1),
    db.select({ role: teamMembers.role }).from(teamMembers).where(eq(teamMembers.teamId, teamId)),
  ]);
  const wanted = team[0]?.rolesNeeded?.length
    ? team[0].rolesNeeded
    : TEAM_ROLES;
  const filled = new Set(
    members.map((m) => m.role?.toLowerCase()).filter((r): r is string => Boolean(r)),
  );
  return wanted.filter((r) => !filled.has(r.toLowerCase()));
}

export async function searchPartners(input: {
  currentUserId?: string | null;
  q?: string;
  skill?: string;
  collegeId?: string;
  role?: string;
  teamId?: string;
  page: number;
  pageSize: number;
}) {
  const db = getCoreDb();
  const conditions = [eq(profiles.isOpenToTeam, true)];
  if (input.currentUserId) {
    conditions.push(not(eq(profiles.id, input.currentUserId)));
  }
  if (input.q) {
    conditions.push(
      or(
        ilike(profiles.fullName, `%${input.q}%`),
        ilike(profiles.username, `%${input.q}%`),
        ilike(profiles.studentCode, `%${input.q}%`),
      ) as typeof conditions[number],
    );
  }
  if (input.skill) conditions.push(sql`${profiles.skills} @> ARRAY[${input.skill}]::text[]`);
  if (input.collegeId) conditions.push(eq(profiles.collegeId, input.collegeId));
  if (input.role) conditions.push(eq(profiles.rolePreference, input.role));

  const where = and(...conditions);
  const offset = (input.page - 1) * input.pageSize;

  // Resolve matching context in parallel with the search.
  const [currentProfile, currentGithub, teamContext] = await Promise.all([
    input.currentUserId
      ? db.select().from(profiles).where(eq(profiles.id, input.currentUserId)).limit(1)
      : Promise.resolve([]),
    input.currentUserId
      ? db.select().from(githubData).where(eq(githubData.userId, input.currentUserId)).limit(1)
      : Promise.resolve([]),
    input.teamId
      ? getTeamMissingRoles(input.teamId).then((missingRoles): TeamContext => ({ missingRoles }))
      : Promise.resolve<TeamContext | null>(null),
  ]);

  const [rows, totalRows] = await Promise.all([
    db
      .select({ profile: profiles, college: colleges, github: githubData })
      .from(profiles)
      .leftJoin(colleges, eq(profiles.collegeId, colleges.id))
      .leftJoin(githubData, eq(profiles.id, githubData.userId))
      .where(where)
      .limit(input.pageSize)
      .offset(offset),
    db.select({ total: count() }).from(profiles).where(where),
  ]);

  const current = currentProfile[0];
  const data = rows
    .map((row) => {
      const match = current
        ? compatibilityScore({
            current,
            candidate: row.profile,
            candidateGithub: row.github ?? null,
            currentGithub: currentGithub[0] ?? null,
            team: teamContext,
          })
        : { score: 0, reasons: [] as string[], fillsGap: false };
      return { ...row.profile, college: row.college, github: row.github, compatibility: match };
    })
    .sort((a, b) => b.compatibility.score - a.compatibility.score);

  return {
    rows: data,
    total: Number(totalRows[0]?.total ?? 0),
    page: input.page,
    pageSize: input.pageSize,
    teamContext,
  };
}
