import { get, post, ApiResponse } from './client';
import type { Hackathon } from '../../types';

export interface HackathonListResponse {
  data: Hackathon[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}

function normalizeHackathon(raw: Record<string, unknown>, index: number = 0): Hackathon {
  // If already in frontend format
  if (raw.name && raw.registerDeadline) {
    return raw as unknown as Hackathon;
  }

  const title = (raw.title || raw.name || 'Hackathon') as string;
  const organizer = (raw.organizer || raw.host || 'Unstop') as string;
  const location = (raw.location || raw.city || 'Online') as string;
  const themes = Array.isArray(raw.themes) && raw.themes.length > 0 ? (raw.themes as string[]) : ['AI / ML', 'Web'];
  const primaryTrack = themes[0] || 'Open';
  const rawMode = String(raw.mode || 'online').toLowerCase();
  const mode: Hackathon['mode'] = rawMode.includes('hybrid')
    ? 'hybrid'
    : rawMode.includes('person') || rawMode.includes('offline') || rawMode.includes('onsite')
    ? 'onsite'
    : 'remote';

  const prizeNum = Number(raw.prizeAmount || raw.prize) || 100000;
  const deadlineStr = String(raw.registrationDeadlineAt || raw.registerDeadline || new Date(Date.now() + 14 * 86400000).toISOString());
  const startStr = String(raw.startAt || raw.startDate || new Date(Date.now() + 18 * 86400000).toISOString());

  const deadlineDate = new Date(deadlineStr);
  const now = new Date();
  const daysDiff = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const status: Hackathon['status'] = daysDiff < 0 ? 'closed' : daysDiff <= 7 ? 'closing' : 'open';

  const rawId = typeof raw.id === 'string' ? raw.id : `hk-${1000 + index}`;
  const rawKey = typeof raw.canonicalKey === 'string' ? raw.canonicalKey : `HK-${rawId.slice(0, 6).toUpperCase()}`;
  const descriptionStr = typeof raw.description === 'string' ? raw.description : `${primaryTrack} Hackathon organized by ${organizer}. Showcase your skills, build prototypes, and compete for prizes.`;
  const regUrl = typeof raw.registrationUrl === 'string' ? raw.registrationUrl : typeof raw.registration_url === 'string' ? raw.registration_url : undefined;

  return {
    id: rawId,
    code: rawKey,
    name: title,
    host: organizer,
    city: location,
    mode,
    durationHours: 36,
    startDate: startStr,
    registerDeadline: deadlineStr,
    track: primaryTrack,
    tracks: themes,
    prize: prizeNum,
    currency: 'INR',
    maxTeamSize: Number(raw.teamSizeMax) || 4,
    minTeamSize: Number(raw.teamSizeMin) || 1,
    demand: daysDiff <= 10 ? 'high' : daysDiff <= 25 ? 'medium' : 'low',
    trackDemands: { ml: 0.85, backend: 0.8, frontend: 0.75 },
    description: descriptionStr,
    status,
    registrationUrl: regUrl,
  };
}

export async function listHackathons(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  mode?: string;
  track?: string;
  closing?: string;
  size?: string;
  seeking?: boolean;
}): Promise<HackathonListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
  if (params?.q) searchParams.set('q', params.q);
  if (params?.mode && params.mode !== 'all') searchParams.set('mode', params.mode);
  if (params?.track && params.track !== 'all') searchParams.set('theme', params.track);

  const query = searchParams.toString();
  const endpoint = `/api/hackathons${query ? `?${query}` : ''}`;

  try {
    const res = await get<{ data?: Record<string, unknown>[] | { data?: Record<string, unknown>[]; meta?: { page?: number; pageSize?: number; total?: number; hasMore?: boolean } }; meta?: { page?: number; pageSize?: number; total?: number; hasMore?: boolean } }>(endpoint);
    const innerData = res?.data;
    const rawList: Record<string, unknown>[] = Array.isArray(innerData)
      ? innerData
      : Array.isArray((innerData as { data?: Record<string, unknown>[] })?.data)
        ? (innerData as { data: Record<string, unknown>[] }).data
        : Array.isArray(res)
          ? (res as Record<string, unknown>[])
          : [];
    const normalized = rawList.map((item, i: number) => normalizeHackathon(item, i));
    const meta = (innerData && !Array.isArray(innerData) && 'meta' in innerData ? (innerData as { meta?: { page?: number; pageSize?: number; total?: number; hasMore?: boolean } }).meta : undefined) || res?.meta || {};
    return {
      data: normalized,
      meta: {
        page: meta.page ?? 1,
        pageSize: meta.pageSize ?? normalized.length,
        total: meta.total ?? normalized.length,
        hasMore: meta.hasMore ?? false,
      },
    };
  } catch (error) {
    console.error('Failed to fetch hackathons from API:', error);
    return { data: [], meta: { page: 1, pageSize: 0, total: 0, hasMore: false } };
  }
}

export async function getHackathon(id: string): Promise<Hackathon> {
  const res = await get<any>(`/api/hackathons/${id}`);
  const raw = res?.data?.data || res?.data?.hackathon || res?.data || res;
  return normalizeHackathon(raw);
}

export async function bookmarkHackathon(id: string): Promise<void> {
  return post(`/api/hackathons/${id}/bookmark`);
}

export async function interestHackathon(id: string): Promise<void> {
  return post(`/api/hackathons/${id}/interest`);
}

export async function getBookmarkedHackathons(): Promise<Hackathon[]> {
  const res = await get<ApiResponse<any[]>>('/api/hackathons/bookmarked');
  return (res.data || []).map((item, i) => normalizeHackathon(item, i));
}

export async function refreshHackathons(): Promise<void> {
  await get('/api/cron/ingest');
}