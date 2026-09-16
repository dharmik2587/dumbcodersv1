import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Builder,
  CollabRequest,
  Hackathon,
  Notification,
  Project,
  RoleKey,
  Team,
} from "../types";
import {
  BUILDERS,
  HACKATHONS,
  ME_ID,
  NOTIFICATIONS,
  PROJECTS,
  REQUESTS,
  TEAMS,
} from "../data/seed";

export type Toast = {
  id: number;
  label: string;
  body: string;
  tone: "info" | "good" | "warn" | "bad";
  undo?: () => void;
};

type State = {
  meId: string;
  builders: Builder[];
  hackathons: Hackathon[];
  teams: Team[];
  projects: Project[];
  requests: CollabRequest[];
  notifications: Notification[];
  bookmarks: string[];
  activeTeamId: string | null;
  signedIn: boolean;
  onboarded: boolean;
  prefs: {
    notifyRequests: boolean;
    notifyDeadlines: boolean;
    notifyMatches: boolean;
    discoverable: boolean;
    showCollege: boolean;
    showRepos: boolean;
    allowRequests: boolean;
  };
  toasts: Toast[];

  /* actions */
  signIn: () => void;
  signOut: () => void;
  finishOnboarding: (patch: Partial<Builder>) => void;
  updateMe: (patch: Partial<Builder>) => void;
  toggleBookmark: (id: string) => void;
  setActiveTeam: (id: string | null) => void;
  createTeam: (t: Omit<Team, "id">) => string;
  removeMember: (teamId: string, builderId: string) => void;
  addTeamMember: (teamId: string, builderId: string, role: RoleKey) => void;
  closeSlot: (teamId: string, role: RoleKey) => void;
  sendRequest: (r: Omit<CollabRequest, "id" | "createdAt" | "state">) => void;
  setRequestState: (id: string, state: CollabRequest["state"]) => void;
  acceptRequest: (id: string) => void;
  moveTask: (projectId: string, taskId: string, column: "todo" | "doing" | "done") => void;
  addTask: (projectId: string, title: string) => void;
  toggleChecklist: (projectId: string, id: string) => void;
  appendLog: (projectId: string, label: string) => void;
  setNotes: (projectId: string, notes: string) => void;
  addProject: (teamId: string, hackathonId: string | null, name: string) => string;
  readNotification: (id: string) => void;
  readAllNotifications: () => void;
  setPref: (k: keyof State["prefs"], v: boolean) => void;
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  resetDemo: () => void;
};

const byIdMap = (list: Builder[]) => new Map(list.map((b) => [b.id, b]));
export const buildersMap = byIdMap(BUILDERS);

let toastSeq = 1;

const initial = () => ({
  meId: ME_ID,
  builders: BUILDERS,
  hackathons: HACKATHONS,
  teams: TEAMS,
  projects: PROJECTS,
  requests: REQUESTS,
  notifications: NOTIFICATIONS,
  bookmarks: ["hk-1000", "hk-1005"],
  activeTeamId: "t-orbit" as string | null,
  signedIn: true,
  onboarded: true,
  prefs: {
    notifyRequests: true,
    notifyDeadlines: true,
    notifyMatches: true,
    discoverable: true,
    showCollege: true,
    showRepos: true,
    allowRequests: true,
  },
});

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial(),
      toasts: [],

      signIn: () => set({ signedIn: true }),
      signOut: () => set({ signedIn: false }),

      finishOnboarding: (patch) =>
        set((s) => ({
          onboarded: true,
          builders: s.builders.map((b) => (b.id === s.meId ? { ...b, ...patch } : b)),
        })),

      updateMe: (patch) =>
        set((s) => ({
          builders: s.builders.map((b) => (b.id === s.meId ? { ...b, ...patch } : b)),
        })),

      toggleBookmark: (id) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(id)
            ? s.bookmarks.filter((b) => b !== id)
            : [...s.bookmarks, id],
        })),

      setActiveTeam: (id) => set({ activeTeamId: id }),

      createTeam: (t) => {
        const id = `t-${Math.random().toString(36).slice(2, 7)}`;
        set((s) => ({ teams: [...s.teams, { ...t, id }], activeTeamId: id }));
        return id;
      },

      removeMember: (teamId, builderId) =>
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === teamId
              ? { ...t, members: t.members.filter((m) => m.builderId !== builderId) }
              : t,
          ),
        })),

      addTeamMember: (teamId, builderId, role) =>
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === teamId
              ? {
                  ...t,
                  members: [...t.members, { builderId, role, joinedAt: new Date().toISOString() }],
                }
              : t,
          ),
        })),

      closeSlot: (teamId, role) =>
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === teamId
              ? { ...t, openSlots: t.openSlots.filter((o) => o.role !== role) }
              : t,
          ),
        })),

      sendRequest: (r) =>
        set((s) => ({
          requests: [
            {
              ...r,
              id: `REQ-${2300 + s.requests.length}`,
              state: "new",
              createdAt: new Date().toISOString(),
            },
            ...s.requests,
          ],
        })),

      setRequestState: (id, state) =>
        set((s) => ({
          requests: s.requests.map((r) => (r.id === id ? { ...r, state } : r)),
        })),

      acceptRequest: (id) => {
        const req = get().requests.find((r) => r.id === id);
        if (!req) return;
        get().addTeamMember(req.teamId, req.fromId, req.role);
        get().closeSlot(req.teamId, req.role);
        set((s) => ({
          requests: s.requests.map((r) => (r.id === id ? { ...r, state: "accepted" } : r)),
        }));
        if (req.teamId) {
          const proj = get().projects.find((p) => p.teamId === req.teamId);
          if (proj) get().appendLog(proj.id, `${req.fromId} accepted · ${req.role} slot closed`);
        }
      },

      moveTask: (projectId, taskId, column) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  tasks: p.tasks.map((t) =>
                    t.id === taskId ? { ...t, column, done: column === "done" } : t,
                  ),
                }
              : p,
          ),
        })),

      addTask: (projectId, title) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  tasks: [
                    ...p.tasks,
                    {
                      id: `k-${Math.random().toString(36).slice(2, 7)}`,
                      projectId,
                      title,
                      ownerId: null,
                      column: "todo",
                    },
                  ],
                }
              : p,
          ),
        })),

      toggleChecklist: (projectId, id) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  checklist: p.checklist.map((c) =>
                    c.id === id ? { ...c, done: !c.done } : c,
                  ),
                }
              : p,
          ),
        })),

      appendLog: (projectId, label) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  log: [
                    ...p.log,
                    {
                      id: `l-${Math.random().toString(36).slice(2, 7)}`,
                      projectId,
                      at: new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                      label,
                      state: "done" as const,
                    },
                  ],
                }
              : p,
          ),
        })),

      setNotes: (projectId, notes) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === projectId ? { ...p, notes } : p)),
        })),

      addProject: (teamId, hackathonId, name) => {
        const id = "proj-" + Math.random().toString(36).slice(2, 9);
        const newProj = {
          id,
          teamId,
          hackathonId: hackathonId || "h-xyz",
          name,
          submissionAt: new Date(Date.now() + 86400000 * 3).toISOString(),
          tasks: [],
          checklist: [],
          log: [],
          commitsByDay: [0, 0, 0, 0, 0, 0, 0],
          commitCount: 0,
          notes: "",
        };
        set((s) => ({ projects: [...s.projects, newProj] }));
        return id;
      },

      readNotification: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        })),

      readAllNotifications: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),

      setPref: (k, v) =>
        set((s) => ({ prefs: { ...s.prefs, [k]: v } })),

      pushToast: (t) => {
        const id = toastSeq++;
        set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
        window.setTimeout(() => get().dismissToast(id), t.undo ? 6000 : 4200);
      },

      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      resetDemo: () => set({ ...initial(), toasts: [] }),
    }),
    {
      name: "hackmate.state.v1",
      partialize: (s) => {
        const { toasts, builders, hackathons, ...rest } = s;
        void toasts;
        void builders;
        void hackathons;
        return {
          ...rest,
          teams: s.teams,
          projects: s.projects,
          requests: s.requests,
          notifications: s.notifications,
        } as never;
      },
    },
  ),
);

export function useMe(): Builder {
  const meId = useStore((s) => s.meId);
  const builders = useStore((s) => s.builders);
  return builders.find((b) => b.id === meId) ?? builders[0];
}

export function useBuilder(id: string | undefined): Builder | undefined {
  const builders = useStore((s) => s.builders);
  return builders.find((b) => b.id === id);
}

export function useHackathon(id: string | undefined): Hackathon | undefined {
  const list = useStore((s) => s.hackathons);
  return list.find((h) => h.id === id);
}

export function useActiveTeam(): Team | undefined {
  const id = useStore((s) => s.activeTeamId);
  const teams = useStore((s) => s.teams);
  return teams.find((t) => t.id === id) ?? teams[0];
}

export { byIdMap };
