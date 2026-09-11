export interface NormalizedHackathon {
  source: string;
  sourceId: string;
  title: string;
  description?: string | null;
  organizer?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  registrationDeadlineAt?: string | null;
  timezone: string;
  mode?: 'online' | 'offline' | 'hybrid' | string | null;
  location?: string | null;
  teamSizeMin?: number | null;
  teamSizeMax?: number | null;
  prizeAmount?: number | null;
  prizeCurrency: string;
  prizeDisplay?: string | null;
  themes?: string[];
  techStack?: string[];
  registrationUrl?: string | null;
  sourceUrl?: string | null;
  rawPayload: Record<string, unknown>;
}

export interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  lastCheckedAt: string;
  error?: string;
}

export interface HackathonProvider {
  name: string;
  fetchHackathons(): Promise<NormalizedHackathon[]>;
  healthCheck?(): Promise<ProviderHealth>;
  getDetails?(id: string): Promise<NormalizedHackathon | null>;
}

export interface ProviderSyncSummary {
  status: 'success' | 'failed' | 'partial';
  received: number;
  created: number;
  updated: number;
  rejected: number;
  errorCode?: string;
  errorMessage?: string;
  durationMs: number;
}
