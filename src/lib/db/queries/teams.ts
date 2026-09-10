import { and, eq } from 'drizzle-orm';
import { getCoreDb } from '@/lib/db/core';
import { profiles, teamMembers, teamMessages, teams } from '@/lib/db/schema/core';
import { sqlEncrypt, sqlDecrypt } from '@/lib/crypto';

export async function getTeamById(teamId: string) {
  const db = getCoreDb();
  const rows = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!rows[0]) return null;
  const members = await db
    .select({ member: teamMembers, profile: profiles })
    .from(teamMembers)
    .innerJoin(profiles, eq(teamMembers.userId, profiles.id))
    .where(eq(teamMembers.teamId, teamId));
  return { team: rows[0], members };
}

export async function isTeamMember(teamId: string, userId: string) {
  const db = getCoreDb();
  const rows = await db.select({ id: teamMembers.id }).from(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))).limit(1);
  return Boolean(rows[0]);
}

export async function listMyTeams(userId: string) {
  const db = getCoreDb();
  // Find all teams the user belongs to
  const userTeamRows = await db
    .select({ team: teams, membership: teamMembers })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId))
    .orderBy(teams.updatedAt);

  if (!userTeamRows.length) return [];

  // For each team, fetch ALL members with their profile details
  const teamIds = userTeamRows.map((r) => r.team.id);
  const allMembers = await db
    .select({
      teamId: teamMembers.teamId,
      userId: teamMembers.userId,
      role: teamMembers.role,
      joinedAt: teamMembers.joinedAt,
      profile: {
        id: profiles.id,
        fullName: profiles.fullName,
        username: profiles.username,
        avatarUrl: profiles.avatarUrl,
        studentCode: profiles.studentCode,
        rolePreference: profiles.rolePreference,
      },
    })
    .from(teamMembers)
    .innerJoin(profiles, eq(teamMembers.userId, profiles.id));

  const membersByTeam = new Map<string, any[]>();
  allMembers.forEach((m) => {
    const list = membersByTeam.get(m.teamId) || [];
    list.push({
      builderId: m.userId,
      role: (m.role === 'leader' ? 'backend' : (m.role || 'backend')) as string,
      joinedAt: m.joinedAt?.toISOString?.() || new Date().toISOString(),
      name: m.profile?.fullName || m.profile?.username || 'Teammate',
      username: m.profile?.username,
      avatarUrl: m.profile?.avatarUrl,
      studentCode: m.profile?.studentCode,
    });
    membersByTeam.set(m.teamId, list);
  });

  return userTeamRows.map((row) => ({
    team: {
      ...row.team,
      members: membersByTeam.get(row.team.id) || [],
    },
    membership: row.membership,
  }));
}

export async function createTeamMessage(teamId: string, userId: string, content: string) {
  const db = getCoreDb();
  const [msg] = await db
    .insert(teamMessages)
    .values({
      teamId,
      userId,
      content: sqlEncrypt(content) as unknown as string,
      createdAt: new Date(),
    })
    .returning({
      id: teamMessages.id,
      teamId: teamMessages.teamId,
      userId: teamMessages.userId,
      content: sqlDecrypt(teamMessages.content),
      createdAt: teamMessages.createdAt,
    });
  return msg;
}

export async function listTeamMessages(teamId: string) {
  const db = getCoreDb();
  return db
    .select({
      id: teamMessages.id,
      content: sqlDecrypt(teamMessages.content),
      createdAt: teamMessages.createdAt,
      userId: teamMessages.userId,
      authorName: profiles.fullName,
      authorUsername: profiles.username,
      authorAvatar: profiles.avatarUrl,
      authorStudentCode: profiles.studentCode,
    })
    .from(teamMessages)
    .innerJoin(profiles, eq(teamMessages.userId, profiles.id))
    .where(eq(teamMessages.teamId, teamId))
    .orderBy(teamMessages.createdAt);
}
