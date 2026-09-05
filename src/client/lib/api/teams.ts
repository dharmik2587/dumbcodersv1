import { get, post, put, del, ApiResponse } from './client';

export interface Team {
  id: string;
  name: string;
  hackathonId: string;
  ownerId: string;
  leaderId: string;
  rolesNeeded: string[];
  isOpen: boolean;
  status: string;
  result?: string;
  resultNote?: string;
  projectName?: string;
  projectUrl?: string;
  demoUrl?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: string;
  joinedAt: string;
}

export interface CreateTeamData {
  name: string;
  hackathonId?: string;
  description?: string;
  rolesNeeded?: string[];
  maxMembers?: number;
  isOpen?: boolean;
}

export async function listMyTeams(): Promise<Team[]> {
  return get<ApiResponse<Team[]>>('/api/teams/my').then(res => res.data!);
}

export async function getTeam(id: string): Promise<Team> {
  return get<ApiResponse<Team>>(`/api/teams/${id}`).then(res => res.data!);
}

export async function createTeam(data: CreateTeamData): Promise<Team> {
  return post<ApiResponse<Team>>('/api/teams', data).then(res => res.data!);
}

export async function updateTeam(id: string, data: Partial<Team>): Promise<Team> {
  return put<ApiResponse<Team>>(`/api/teams/${id}`, data).then(res => res.data!);
}

export async function inviteToTeam(teamId: string, userId: string): Promise<void> {
  return post(`/api/teams/${teamId}/invite`, { userId });
}

export async function applyToTeam(teamId: string, message?: string): Promise<void> {
  return post(`/api/teams/${teamId}/apply`, { message });
}

export async function approveTeamMember(teamId: string, userId: string): Promise<void> {
  return post(`/api/teams/${teamId}/approve/${userId}`);
}

export async function updateTeamMemberRole(teamId: string, userId: string, role: string): Promise<void> {
  return put(`/api/teams/${teamId}/members/${userId}`, { role });
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  return del(`/api/teams/${teamId}/members/${userId}`);
}

export async function getTeamMessages(teamId: string): Promise<any[]> {
  return get<ApiResponse<any[]>>(`/api/teams/${teamId}/messages`).then(res => res.data!);
}

export async function sendTeamMessage(teamId: string, content: string): Promise<void> {
  return post(`/api/teams/${teamId}/messages`, { content });
}