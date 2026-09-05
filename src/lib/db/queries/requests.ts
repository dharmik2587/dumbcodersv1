import { and, desc, eq, or } from 'drizzle-orm';
import { getCoreDb } from '@/lib/db/core';
import { profiles, teamRequests, teams } from '@/lib/db/schema/core';

export async function listRequests(userId: string, direction: 'received' | 'sent' | 'all' = 'all') {
  const db = getCoreDb();
  const condition = direction === 'received'
    ? eq(teamRequests.toUserId, userId)
    : direction === 'sent'
      ? eq(teamRequests.fromUserId, userId)
      : or(eq(teamRequests.toUserId, userId), eq(teamRequests.fromUserId, userId));

  const rows = await db
    .select({ request: teamRequests, from: profiles, team: teams })
    .from(teamRequests)
    .innerJoin(profiles, eq(teamRequests.fromUserId, profiles.id))
    .leftJoin(teams, eq(teamRequests.teamId, teams.id))
    .where(condition)
    .orderBy(desc(teamRequests.createdAt));

  if (!rows.length) return [];

  // Also resolve toUser profiles for sent requests
  const toUserIds = Array.from(new Set(rows.map((r) => r.request.toUserId)));
  const toProfiles = await db
    .select()
    .from(profiles)
    .where(or(...toUserIds.map((id) => eq(profiles.id, id))));
  const toProfileMap = new Map(toProfiles.map((p) => [p.id, p]));

  return rows.map((r) => ({
    ...r,
    to: toProfileMap.get(r.request.toUserId) ?? null,
  }));
}

export async function getRequestById(id: string) {
  const db = getCoreDb();
  const rows = await db.select().from(teamRequests).where(eq(teamRequests.id, id)).limit(1);
  return rows[0] ?? null;
}
