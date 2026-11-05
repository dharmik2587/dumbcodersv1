import type { Builder } from '../types';

/**
 * Builds the PATCH body for /api/users/me containing ONLY the fields the user actually changed.
 *
 * Sending the whole form every time would write placeholder defaults back to the database and
 * could wipe fields the form never loaded. Diffing against the last server copy prevents both.
 */
export function buildProfilePatch(draft: Builder, server: Builder, now: Date = new Date()): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

  if (draft.name.trim() && draft.name.trim() !== server.name) patch.fullName = draft.name.trim();
  if (draft.handle.trim() && draft.handle.trim() !== server.handle) patch.username = draft.handle.trim();

  const draftCollege = (draft.collegeName ?? draft.college).trim();
  const serverCollege = (server.collegeName ?? server.college).trim();
  if (draftCollege !== serverCollege) {
    if (draftCollege) patch.college = draftCollege;
    else patch.collegeId = null;
  }

  if (draft.bio !== server.bio) patch.bio = draft.bio;
  if (draft.branch !== server.branch) patch.branch = draft.branch;

  if (draft.year !== server.year) {
    patch.graduationYear = draft.year >= 1980 ? draft.year : now.getFullYear() + (4 - draft.year);
  }

  if (draft.role !== server.role) patch.rolePreference = draft.role;
  if (!same(draft.secondary, server.secondary)) patch.secondaryRoles = draft.secondary;
  if (draft.goal !== server.goal) patch.goal = draft.goal;

  const selected = (b: Builder) =>
    b.skills
      .filter((s) => s.level > 0)
      .map((s) => ({ id: s.id, label: s.label, level: s.level }))
      .sort((a, c) => a.id.localeCompare(c.id));
  const draftSkills = selected(draft);
  if (!same(draftSkills, selected(server))) {
    patch.skills = draftSkills.map((s) => s.label);
    patch.skillLevels = Object.fromEntries(draftSkills.map((s) => [s.id, s.level]));
  }

  if (!same(draft.availability, server.availability)) patch.availability = JSON.stringify(draft.availability);

  const cleanRepos = draft.repos.filter((r) => r.name.trim().length > 0);
  if (!same(cleanRepos, server.repos)) patch.customRepos = cleanRepos;

  if (draft.openToTeams !== server.openToTeams) patch.isOpenToTeam = draft.openToTeams;

  return patch;
}
