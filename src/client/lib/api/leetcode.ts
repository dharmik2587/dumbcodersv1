export interface LeetcodeConnectResponse {
  success: boolean;
  status: 'pending';
  username: string;
  verification_code: string;
  expires_at: string;
  message: string;
}

export interface LeetcodeVerifyResponse {
  success: boolean;
  verified: boolean;
  username?: string;
  message?: string;
  error?: string;
}

export interface LeetcodeStatusResponse {
  success: boolean;
  connected: boolean;
  verified: boolean;
  username?: string;
  verified_at?: string;
  last_synced_at?: string;
  status?: string;
  verification_code?: string;
  expires_at?: string;
}

export interface LeetcodeStatsResponse {
  success: boolean;
  username: string;
  stats: {
    total_solved: number;
    easy_solved: number;
    medium_solved: number;
    hard_solved: number;
    ranking: number | null;
    contest_rating: number | null;
    contests_attended: number;
  };
  synced_at?: string;
}

export async function connectLeetcode(username: string): Promise<LeetcodeConnectResponse> {
  const res = await fetch('/api/leetcode/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to connect LeetCode');
  }
  return data;
}

export async function verifyLeetcode(username: string): Promise<LeetcodeVerifyResponse> {
  const res = await fetch('/api/leetcode/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Verification failed');
  }
  return data;
}

export async function getLeetcodeStatus(): Promise<LeetcodeStatusResponse> {
  const res = await fetch('/api/leetcode/status');
  const data = await res.json();
  return data;
}

export async function syncLeetcodeStats(): Promise<any> {
  const res = await fetch('/api/leetcode/sync', { method: 'POST' });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to sync statistics');
  }
  return data;
}

export async function disconnectLeetcode(): Promise<any> {
  const res = await fetch('/api/leetcode/disconnect', { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to disconnect');
  }
  return data;
}
