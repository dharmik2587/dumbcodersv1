import { get, patch, ApiResponse } from './client';

export interface Builder {
  id: string;
  studentCode?: string;
  handle: string;
  name: string;
  initials: string;
  college: string;
  year: number;
  branch: string;
  city: string;
  role: string;
  secondary: string[];
  goal: 'win' | 'learn' | 'ship';
  bio: string;
  skills: Array<{
    id: string;
    cluster: string;
    label: string;
    level: number;
  }>;
  repos: Array<{
    name: string;
    lang: string;
    stars: number;
    url: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    role: string;
    year: number;
    outcome: string;
    url?: string;
  }>;
  events: Array<{
    hackathonId: string;
    year: number;
    placement?: string;
  }>;
  availability: Array<{
    day: number;
    start: number;
    end: number;
  }>;
  weeklyHours: number;
  openToTeams: boolean;
  verified: boolean;
  lastActive: string;
}

export interface PartnerSearchResponse {
  data: Record<string, unknown>[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}

export async function searchPartners(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  skill?: string;
  collegeId?: string;
  role?: string;
  teamId?: string;
}): Promise<PartnerSearchResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
  if (params?.q) searchParams.set('q', params.q);
  if (params?.skill) searchParams.set('skill', params.skill);
  if (params?.collegeId) searchParams.set('collegeId', params.collegeId);
  if (params?.role) searchParams.set('role', params.role);
  if (params?.teamId) searchParams.set('teamId', params.teamId);

  const query = searchParams.toString();
  const endpoint = `/api/users/search${query ? `?${query}` : ''}`;

  return get<ApiResponse<PartnerSearchResponse>>(endpoint).then(res => res.data!);
}

export async function getCurrentUser(): Promise<Record<string, unknown>> {
  return get<ApiResponse<Record<string, unknown>>>('/api/users/me').then(res => res.data!);
}

export async function updateCurrentUser(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return patch<ApiResponse<Record<string, unknown>>>('/api/users/me', data).then(res => res.data!);
}

export async function getUserProfile(username: string): Promise<Record<string, unknown>> {
  return get<ApiResponse<Record<string, unknown>>>(`/api/users/${username}`).then(res => res.data!);
}