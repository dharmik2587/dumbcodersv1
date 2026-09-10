import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as api from '../lib/api';
import * as auth from '../lib/auth';
import * as requestsApi from '../lib/api/requests';
import type { Builder, Hackathon, Team, Notification, CollabRequest, Project, RoleKey } from '../types';

export type Toast = {
  id: number;
  label: string;
  body: string;
  tone: 'info' | 'good' | 'warn' | 'bad';
  undo?: () => void;
};

import { CLUSTERS } from '../data/seed';

export function mapProfileToBuilder(profile: Record<string, unknown> | null | undefined): Builder {
  if (!profile) return null as unknown as Builder;
  const rawFullName = typeof profile.fullName === 'string' ? profile.fullName : '';
  const rawUsername = typeof profile.username === 'string' ? profile.username : '';
  const name = rawFullName || rawUsername || 'Builder';
  const initials = name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'B';
  
  // Map skills to taxonomy clusters
  const rawSkills: string[] = Array.isArray(profile.skills) ? (profile.skills as string[]) : [];
  const skills = rawSkills.map((s: string) => {
    const meta = CLUSTERS.find(
      (c) => c.label.toLowerCase() === s.toLowerCase() || c.label.toLowerCase().replace(/[^a-z]+/g, '-') === s.toLowerCase()
    );
    return {
      id: meta ? meta.label.toLowerCase().replace(/[^a-z]+/g, '-') : s.toLowerCase().replace(/[^a-z]+/g, '-'),
      label: meta ? meta.label : s,
      cluster: meta ? meta.cluster : 'interface',
      level: 3 as const,
      verified: true,
    };
  });

  // Map availability
  let availability = [
    { day: 0, start: 18, end: 22 },
    { day: 2, start: 18, end: 22 },
    { day: 5, start: 14, end: 22 },
    { day: 6, start: 14, end: 22 },
  ];
  if (profile.availability) {
    try {
      const parsed = typeof profile.availability === 'string' ? JSON.parse(profile.availability) : profile.availability;
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0].day === 'number') {
        availability = parsed;
      }
    } catch {
      // Keep default
    }
  }

  const weeklyHours = availability.reduce((acc, slot) => acc + (slot.end - slot.start), 0) || 16;

  const collegeObj = profile.college as { shortName?: string; name?: string } | string | undefined;
  const collegeStr = typeof collegeObj === 'object' && collegeObj !== null
    ? (collegeObj.shortName || collegeObj.name || 'Engineering College')
    : (typeof collegeObj === 'string' ? collegeObj : 'Engineering College');

  const gradYear = typeof profile.graduationYear === 'number' ? profile.graduationYear : undefined;
  const yearNum = gradYear ? (gradYear - 2026 + 1) : 3;

  const validRoles: RoleKey[] = ['frontend', 'backend', 'ml', 'design', 'product', 'mobile', 'devops'];
  const prefRole = typeof profile.rolePreference === 'string' ? profile.rolePreference.toLowerCase() : 'frontend';
  const role: RoleKey = validRoles.includes(prefRole as RoleKey) ? (prefRole as RoleKey) : 'frontend';

  const gh = profile.github as { topRepos?: { name: string; lang: string; stars: number; url: string }[] } | undefined;
  const repos = Array.isArray(gh?.topRepos) ? gh.topRepos : [];

  return {
    id: typeof profile.id === 'string' ? profile.id : String(profile.id || ''),
    studentCode: typeof profile.studentCode === 'string' ? profile.studentCode : undefined,
    handle: rawUsername,
    name,
    initials,
    college: collegeStr,
    year: yearNum,
    branch: typeof profile.branch === 'string' ? profile.branch : 'Computer Science',
    city: typeof profile.city === 'string' ? profile.city : 'Campus',
    role,
    secondary: [],
    avatarUrl: typeof profile.avatarUrl === 'string' ? profile.avatarUrl : undefined,
    goal: 'win',
    bio: typeof profile.bio === 'string' ? profile.bio : '',
    skills,
    repos,
    projects: [],
    events: [],
    availability,
    weeklyHours,
    openToTeams: profile.isOpenToTeam !== false,
    verified: true,
    lastActive: typeof profile.updatedAt === 'string' ? profile.updatedAt : (profile.updatedAt instanceof Date ? profile.updatedAt.toISOString() : new Date().toISOString()),
  };
}

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  studentCode?: string;
  college?: string;
  githubUsername?: string;
  leetcodeUsername?: string;
  githubScore: number;
  leetcodeScore: number;
  participationScore: number;
  resultScore: number;
  composite: number;
};

type State = {
  // User state
  me: Builder | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Data state
  hackathons: Hackathon[];
  teams: Team[];
  builders: Builder[];
  projects: Project[];
  requests: CollabRequest[];
  notifications: Notification[];
  bookmarks: string[];
  activeTeamId: string | null;
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;

  // UI state
  toasts: Toast[];

  // Actions
  initializeAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'github' | 'google', redirectTo?: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Record<string, unknown>) => Promise<unknown>;
  loadHackathons: (params?: Record<string, unknown>) => Promise<void>;
  refreshHackathons: () => Promise<void>;
  loadTeams: () => Promise<void>;
  loadBuilders: (params?: Record<string, unknown>) => Promise<void>;
  loadUser: () => Promise<void>;
  loadRequests: (direction?: 'sent' | 'received' | 'all') => Promise<void>;
  loadLeaderboard: (params?: { scope?: 'global' | 'college' | 'batch'; window?: 'week' | 'month' | 'all' }) => Promise<void>;
  submitPlatformUsername: (platform: 'leetcode' | 'github', username: string) => Promise<boolean>;
  createTeam: (data: { name: string; hackathonId?: string; description?: string; maxMembers?: number; rolesNeeded?: string[]; isOpen?: boolean; [key: string]: unknown }) => Promise<string | null>;
  setActiveTeam: (id: string | null) => void;
  toggleBookmark: (id: string) => Promise<void>;
  sendRequest: (data: { toUserId: string; teamId?: string | null; hackathonId?: string | null; message?: string; roleOffered?: string }) => Promise<void>;
  acceptRequest: (id: string) => Promise<void>;
  rejectRequest: (id: string) => Promise<void>;
  withdrawRequest: (id: string) => Promise<void>;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  _mapAuthUserToBuilder: (u: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => Builder;
};

let toastSeq = 1;

export const useApiStore = create<State>()(
  persist(
    (set, get) => ({
      // Initial state
      me: null,
      isAuthenticated: false,
      isLoading: true,
      hackathons: [],
      teams: [],
      builders: [],
      projects: [],
      requests: [],
      notifications: [],
      bookmarks: [],
      activeTeamId: null,
      leaderboard: [],
      leaderboardLoading: false,
      toasts: [],

      // Helper to build initial Builder from Supabase user
      _mapAuthUserToBuilder: (u: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Builder => {
        const meta = (u.user_metadata || {}) as Record<string, string>;
        const name = meta.full_name || meta.name || u.email?.split('@')[0] || 'Builder';
        const initials = name.split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'B';
        return {
          id: u.id,
          name,
          handle: meta.user_name || meta.preferred_username || u.email?.split('@')[0] || 'builder',
          avatar: meta.avatar_url || meta.picture || '',
          avatarUrl: meta.avatar_url || meta.picture || '',
          initials,
          college: meta.college || 'Engineering College',
          year: 3,
          branch: 'Computer Science',
          city: 'India',
          role: 'frontend',
          secondary: ['backend'],
          goal: 'win',
          bio: '',
          skills: [],
          repos: [],
          projects: [],
          events: [],
          availability: [],
          weeklyHours: 15,
          openToTeams: true,
          verified: true,
          lastActive: new Date().toISOString(),
        };
      },

      // Initialize auth on app load
      initializeAuth: async () => {
        try {
          const authState = await auth.getCurrentAuthState();
          if (authState.user) {
            // Always set fresh data from Supabase user first
            const initialBuilder = get()._mapAuthUserToBuilder(authState.user);
            set({
              isAuthenticated: true,
              isLoading: false,
              me: initialBuilder,
            });
            // Then load full profile from Neon DB (overwrites initialBuilder)
            try {
              await get().loadUser();
              await get().loadTeams();
              await get().loadRequests();
            } catch (e) {
              console.warn('Data loading during auth init:', e);
            }
          } else {
            set({ isAuthenticated: false, isLoading: false, me: null });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ isAuthenticated: false, isLoading: false, me: null });
        }

        // Listen for auth state changes (handles OAuth callback, tab sync, etc.)
        auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            const builder = get()._mapAuthUserToBuilder(session.user);
            set({ isAuthenticated: true, isLoading: false, me: builder });
            try {
              await get().loadUser();
              await get().loadTeams();
              await get().loadRequests();
            } catch (e) {
              console.warn('Data loading on auth change:', e);
            }
          } else if (event === 'SIGNED_OUT') {
            set({
              isAuthenticated: false,
              isLoading: false,
              me: null,
              teams: [],
              builders: [],
              projects: [],
              requests: [],
              bookmarks: [],
              activeTeamId: null,
              leaderboard: [],
            });
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            // Session refreshed — user still valid, no need to reload everything
          }
        });
      },

      // Sign up
      signUp: async (email: string, password: string, metadata?: Record<string, string>) => {
        try {
          await auth.signUp(email, password, metadata);
          const authState = await auth.getCurrentAuthState();
          if (authState.user) {
            set({
              isAuthenticated: true,
              me: get()._mapAuthUserToBuilder(authState.user),
            });
            await get().loadUser();
            await get().loadTeams();
            get().pushToast({
              label: 'Success',
              body: 'Account created successfully',
              tone: 'good',
            });
          }
        } catch (error) {
          console.error('Sign up error:', error);
          get().pushToast({
            label: 'Error',
            body: error instanceof Error ? error.message : 'Failed to sign up',
            tone: 'bad',
          });
          throw error;
        }
      },

      // Sign in
      signIn: async (email: string, password: string) => {
        try {
          await auth.signIn(email, password);
          const authState = await auth.getCurrentAuthState();
          if (authState.user) {
            set({
              isAuthenticated: true,
              me: get()._mapAuthUserToBuilder(authState.user),
            });
            await get().loadUser();
            await get().loadTeams();
            await get().loadRequests();
            get().pushToast({
              label: 'Success',
              body: 'Signed in successfully',
              tone: 'good',
            });
          }
        } catch (error) {
          console.error('Sign in error:', error);
          get().pushToast({
            label: 'Error',
            body: error instanceof Error ? error.message : 'Failed to sign in',
            tone: 'bad',
          });
          throw error;
        }
      },

      // Sign in with OAuth
      signInWithOAuth: async (provider: 'github' | 'google', redirectTo?: string) => {
        try {
          if (provider === 'github') {
            await auth.signInWithGitHub(redirectTo);
          } else {
            await auth.signInWithGoogle(redirectTo);
          }
        } catch (error) {
          console.error('OAuth Sign in error:', error);
          get().pushToast({
            label: 'Error',
            body: error instanceof Error ? error.message : 'OAuth sign in failed',
            tone: 'bad',
          });
          throw error;
        }
      },

      // Sign out
      signOut: async () => {
        try {
          await auth.signOut();
          set({
            isAuthenticated: false,
            me: null,
            teams: [],
            builders: [],
            projects: [],
            requests: [],
            bookmarks: [],
            activeTeamId: null,
            leaderboard: [],
          });
          // Clear persisted state so stale data doesn't rehydrate on next login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('hackmate.api.state.v3');
          }
          get().pushToast({
            label: 'Success',
            body: 'Signed out successfully',
            tone: 'info',
          });
        } catch (error) {
          console.error('Sign out error:', error);
        }
      },

      // Update user profile in Supabase & database
      updateProfile: async (data: Record<string, any>) => {
        try {
          const updated = await api.updateCurrentUser(data);
          const mappedBuilder = mapProfileToBuilder(updated);
          set((s) => ({
            me: s.me ? { ...s.me, ...mappedBuilder } : mappedBuilder,
          }));
          get().pushToast({
            label: 'Profile saved',
            body: 'Your profile has been updated.',
            tone: 'good',
          });
          return updated;
        } catch (error) {
          console.error('Failed to update profile:', error);
          get().pushToast({
            label: 'Error',
            body: error instanceof Error ? error.message : 'Failed to update profile',
            tone: 'bad',
          });
          throw error;
        }
      },

      // Load hackathons
      loadHackathons: async (params) => {
        params = { pageSize: 200, status: "published", ...params };
        try {
          const response = await api.listHackathons(params);
          set({ hackathons: response.data || [] });
        } catch (error) {
          console.error('Failed to load hackathons:', error);
        }
      },

      // Refresh hackathons from upstream sources
      refreshHackathons: async () => {
        try {
          await api.refreshHackathons();
          await get().loadHackathons();
          get().pushToast({ label: 'Success', body: 'Hackathon index refreshed.', tone: 'good' });
        } catch (error) {
          console.error('Failed to refresh hackathons:', error);
          get().pushToast({ label: 'Error', body: 'Failed to refresh hackathons.', tone: 'bad' });
        }
      },


      // Load teams — maps real { team, membership }[] DB shape to client Team type
      loadTeams: async () => {
        try {
          const rawTeams = await api.listMyTeams();
          // rawTeams is an array of { team, membership } from the DB
          const mappedTeams: Team[] = (rawTeams || []).map((row) => {
            const t = row.team;
            const membership = row.membership;
            const openSlots = ((t.rolesNeeded ?? []) as string[]).map((r) => ({
              role: (['frontend', 'backend', 'ml', 'design', 'product', 'mobile', 'devops'].includes(r) ? r : 'backend') as RoleKey,
              note: '',
            }));
            const members = (t.members && t.members.length > 0)
              ? t.members.map((m) => ({
                  builderId: m.builderId,
                  role: m.role,
                  joinedAt: m.joinedAt,
                }))
              : (membership?.userId || t.leaderId ? [{
                  builderId: membership?.userId || t.leaderId || '',
                  role: (membership?.role === 'leader' ? 'backend' : (membership?.role || 'backend')) as RoleKey,
                  joinedAt: (membership?.joinedAt || (typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString())) as string,
                }] : []);

            return {
              id: t.id,
              name: t.name,
              description: t.description ?? undefined,
              hackathonId: t.hackathonId ?? '',
              leaderId: t.leaderId ?? undefined,
              ownerId: t.leaderId ?? '',
              maxMembers: t.maxMembers ?? 4,
              rolesNeeded: t.rolesNeeded ?? [],
              isOpen: t.isOpen ?? true,
              status: t.status ?? 'forming',
              projectName: t.projectName ?? undefined,
              projectUrl: t.projectUrl ?? undefined,
              demoUrl: t.demoUrl ?? undefined,
              createdAt: typeof t.createdAt === 'string' ? t.createdAt : undefined,
              updatedAt: typeof t.updatedAt === 'string' ? t.updatedAt : undefined,
              members,
              openSlots,
              visibility: (t.isOpen ? 'discoverable' : 'private') as 'discoverable' | 'private',
              project: (t.projectName ?? undefined) as string | undefined,
            };
          });
          set({ teams: mappedTeams });
          if (mappedTeams.length > 0 && !get().activeTeamId) {
            set({ activeTeamId: mappedTeams[0].id });
          }
        } catch (error) {
          console.error('Failed to load teams:', error);
        }
      },

      // Load builders / partner search
      loadBuilders: async (params) => {
        try {
          const response = await api.searchPartners(params);
          set({ builders: (response.data || []).map((p) => mapProfileToBuilder(p as Record<string, unknown>)) });
        } catch (error) {
          console.error('Failed to load builders:', error);
        }
      },

      // Load current user
      loadUser: async () => {
        try {
          const user = await api.getCurrentUser();
          set({ me: mapProfileToBuilder(user) });
        } catch (error) {
          console.error('Failed to load user:', error);
        }
      },


      // Load leaderboard
      loadLeaderboard: async (params) => {
        try {
          set({ leaderboardLoading: true });
          const response = await api.getLeaderboard(params);
          set({ leaderboard: response.data, leaderboardLoading: false });
        } catch (error) {
          console.error('Failed to load leaderboard:', error);
          set({ leaderboardLoading: false });
        }
      },

      // Submit platform username (LeetCode / GitHub)
      submitPlatformUsername: async (platform, username) => {
        try {
          const result = await api.submitPlatformUsername(platform, username);
          get().pushToast({ label: 'Linked', body: result.message, tone: 'good' });
          // Refresh leaderboard to show updated scores
          await get().loadLeaderboard();
          return true;
        } catch (error: unknown) {
          console.error('Failed to submit platform username:', error);
          get().pushToast({
            label: 'Error',
            body: error instanceof Error ? error.message : `Could not link ${platform} account.`,
            tone: 'bad',
          });
          return false;
        }
      },

      // Create team — sends only fields the API schema accepts
      createTeam: async (data) => {
        try {
          const payload: api.CreateTeamData = {
            name: data.name,
          };
          if (data.hackathonId) payload.hackathonId = data.hackathonId;
          if (data.description) payload.description = data.description;
          if (data.maxMembers) payload.maxMembers = data.maxMembers;
          if (data.rolesNeeded) payload.rolesNeeded = data.rolesNeeded;
          if (typeof data.isOpen === 'boolean') payload.isOpen = data.isOpen;
          const team = await api.createTeam(payload);
          await get().loadTeams();
          set({ activeTeamId: team.id });
          get().pushToast({ label: 'Success', body: `Team "${team.name}" created`, tone: 'good' });
          return team.id;
        } catch (error) {
          console.error('Failed to create team:', error);
          get().pushToast({ label: 'Error', body: 'Failed to create team', tone: 'bad' });
          return null;
        }
      },

      // Load requests from the real DB
      loadRequests: async (direction = 'all') => {
        try {
          const data = await requestsApi.listRequests(direction);
          set({ requests: (data || []) as unknown as CollabRequest[] });
        } catch (error) {
          console.error('Failed to load requests:', error);
        }
      },

      // Send a collaboration request via real API
      sendRequest: async (data) => {
        try {
          await requestsApi.sendCollabRequest(data);
          await get().loadRequests();
          get().pushToast({ label: 'Request sent', body: 'Your collaboration request was delivered.', tone: 'good' });
        } catch (error: unknown) {
          console.error('Failed to send request:', error);
          get().pushToast({ label: 'Error', body: error instanceof Error ? error.message : 'Could not send request.', tone: 'bad' });
          throw error;
        }
      },

      // Accept a request via real API
      acceptRequest: async (id) => {
        try {
          await requestsApi.acceptRequest(id);
          await get().loadRequests();
          await get().loadTeams();
          get().pushToast({ label: 'Accepted', body: 'They have been added to the team.', tone: 'good' });
        } catch (error: unknown) {
          console.error('Failed to accept request:', error);
          get().pushToast({ label: 'Error', body: error instanceof Error ? error.message : 'Could not accept request.', tone: 'bad' });
        }
      },

      // Reject a request via real API
      rejectRequest: async (id) => {
        try {
          await requestsApi.rejectRequest(id);
          await get().loadRequests();
          get().pushToast({ label: 'Declined', body: 'Request declined.', tone: 'info' });
        } catch (error: unknown) {
          console.error('Failed to reject request:', error);
          get().pushToast({ label: 'Error', body: error instanceof Error ? error.message : 'Could not decline request.', tone: 'bad' });
        }
      },

      // Withdraw a sent request via real API
      withdrawRequest: async (id) => {
        try {
          await requestsApi.withdrawRequest(id);
          await get().loadRequests();
          get().pushToast({ label: 'Withdrawn', body: 'Your request has been withdrawn.', tone: 'info' });
        } catch (error: unknown) {
          console.error('Failed to withdraw request:', error);
          get().pushToast({ label: 'Error', body: error instanceof Error ? error.message : 'Could not withdraw request.', tone: 'bad' });
        }
      },

      // Set active team
      setActiveTeam: (id) => set({ activeTeamId: id }),

      // Toggle bookmark
      toggleBookmark: async (id) => {
        try {
          await api.bookmarkHackathon(id);
          set((s) => ({
            bookmarks: s.bookmarks.includes(id)
              ? s.bookmarks.filter((b) => b !== id)
              : [...s.bookmarks, id],
          }));
        } catch (error) {
          console.error('Failed to toggle bookmark:', error);
        }
      },

      // Toast actions
      pushToast: (t) => {
        const id = toastSeq++;
        set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
        setTimeout(() => get().dismissToast(id), t.undo ? 6000 : 4200);
      },

      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'hackmate.api.state.v3',
      version: 3,
      partialize: (s) => ({
        // Only persist lightweight, non-auth state.
        // Auth state (me, isAuthenticated, isLoading) is ALWAYS
        // re-computed from the server on page load via initializeAuth.
        bookmarks: s.bookmarks,
        activeTeamId: s.activeTeamId,
      } as never),
    },
  ),
);

const DEFAULT_BUILDER: Builder = {
  id: 'me-guest',
  name: 'Demo Builder',
  handle: 'builder',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
  college: 'IIT Bombay',
  year: 2026,
  initials: 'DB',
  branch: 'Computer Science',
  city: 'Mumbai',
  role: 'frontend',
  secondary: ['backend'],
  goal: 'learn',
  bio: 'Fullstack builder interested in systems and web applications.',
  skills: [
    { id: 's1', cluster: 'frontend', label: 'React', level: 3, verified: true },
    { id: 's2', cluster: 'backend', label: 'Node.js', level: 3, verified: true },
    { id: 's3', cluster: 'systems', label: 'Go', level: 2, verified: false },
  ],
  repos: [
    { name: 'hackmate', lang: 'TypeScript', stars: 10, url: 'https://github.com' }
  ],
  projects: [],
  events: [],
  availability: [
    { day: 1, start: 18, end: 22 },
    { day: 2, start: 18, end: 22 },
    { day: 3, start: 18, end: 22 }
  ],
  weeklyHours: 12,
  openToTeams: true,
  verified: true,
  lastActive: new Date().toISOString(),
};

export function byIdMap<T extends { id: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>();
  items.forEach((item) => map.set(item.id, item));
  return map;
}

export function useMe(): Builder {
  const me = useApiStore((s) => s.me);
  return me ?? DEFAULT_BUILDER;
}

export function useActiveTeam(): Team | undefined {
  const id = useApiStore((s) => s.activeTeamId);
  const teams = useApiStore((s) => s.teams);
  return teams.find((t) => t.id === id) ?? teams[0];
}

export function useHackathon(id: string | undefined): Hackathon | undefined {
  const list = useApiStore((s) => s.hackathons);
  return list.find((h) => h.id === id);
}

export function useBuilder(id: string | undefined): Builder | undefined {
  const builders = useApiStore((s) => s.builders);
  return builders.find((b) => b.id === id);
}

