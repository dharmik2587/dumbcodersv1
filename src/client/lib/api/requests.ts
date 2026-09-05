import { get, post, ApiResponse } from './client';

export interface DbRequest {
  id: string;
  type: string;
  fromUserId: string;
  toUserId: string;
  teamId: string | null;
  hackathonId: string | null;
  message: string | null;
  roleOffered: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt: string;
  updatedAt: string;
  // Joined fields from DB queries
  from?: {
    id: string;
    fullName: string | null;
    username: string;
    avatarUrl: string | null;
    studentCode: string | null;
  };
  team?: {
    id: string;
    name: string;
  } | null;
}

export async function listRequests(direction: 'sent' | 'received' | 'all' = 'all'): Promise<any[]> {
  return get<ApiResponse<any[]>>(`/api/requests?direction=${direction}`).then(res => res.data!);
}

export async function sendCollabRequest(data: {
  toUserId: string;
  teamId?: string | null;
  hackathonId?: string | null;
  message?: string;
  roleOffered?: string;
}): Promise<DbRequest> {
  return post<ApiResponse<DbRequest>>('/api/requests', data).then(res => res.data!);
}

export async function acceptRequest(id: string): Promise<void> {
  return post(`/api/requests/${id}/accept`, {});
}

export async function rejectRequest(id: string): Promise<void> {
  return post(`/api/requests/${id}/reject`, {});
}

export async function withdrawRequest(id: string): Promise<void> {
  return post(`/api/requests/${id}/withdraw`, {});
}
