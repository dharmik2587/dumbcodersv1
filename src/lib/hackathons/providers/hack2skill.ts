import type { HackathonProvider, NormalizedHackathon, ProviderHealth } from './types';

const HACK2SKILL_BASE_URL = 'https://hack2skill.com';

export class Hack2SkillProvider implements HackathonProvider {
  name = 'hack2skill';

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    const feedUrl = process.env.HACK2SKILL_FEED_URL || `${HACK2SKILL_BASE_URL}/hackathons`;

    try {
      const res = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'HackMate/1.0',
          Accept: 'application/json, text/html',
        },
        signal: AbortSignal.timeout(8000),
      });

      const latencyMs = Date.now() - start;
      if (!res.ok) {
        return {
          provider: this.name,
          status: 'degraded',
          latencyMs,
          lastCheckedAt: new Date().toISOString(),
          error: `HTTP ${res.status}`,
        };
      }

      return {
        provider: this.name,
        status: 'healthy',
        latencyMs,
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      return {
        provider: this.name,
        status: 'degraded',
        latencyMs: Date.now() - start,
        lastCheckedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Hack2Skill feed unreachable',
      };
    }
  }

  async fetchHackathons(): Promise<NormalizedHackathon[]> {
    const feedUrl = process.env.HACK2SKILL_FEED_URL;

    // If an authorized API/feed is configured in environment, ingest from it
    if (feedUrl) {
      const res = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'HackMate/1.0',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`Hack2Skill upstream returned HTTP ${res.status}`);
      }

      const json = await res.json();
      const items: Array<Record<string, unknown>> = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
      return items.map((item) => {
        const sourceId = String(item.id || item.slug || '').trim();
        const title = String(item.title || item.name || 'Hack2Skill Hackathon').trim();
        const registrationUrl = String(item.registrationUrl || item.url || `${HACK2SKILL_BASE_URL}/hackathons/${sourceId}`);

        return {
          source: 'hack2skill',
          sourceId,
          title,
          description: typeof item.description === 'string' ? item.description : null,
          organizer: typeof item.organizer === 'string' ? item.organizer : 'Hack2Skill',
          startAt: item.startAt ? new Date(String(item.startAt)).toISOString() : null,
          endAt: item.endAt ? new Date(String(item.endAt)).toISOString() : null,
          registrationDeadlineAt: item.registrationDeadlineAt ? new Date(String(item.registrationDeadlineAt)).toISOString() : null,
          timezone: 'Asia/Kolkata',
          mode: String(item.mode || 'online'),
          location: typeof item.location === 'string' ? item.location : null,
          teamSizeMin: typeof item.teamSizeMin === 'number' ? item.teamSizeMin : 1,
          teamSizeMax: typeof item.teamSizeMax === 'number' ? item.teamSizeMax : 4,
          prizeAmount: typeof item.prizeAmount === 'number' ? item.prizeAmount : null,
          prizeCurrency: 'INR',
          prizeDisplay: item.prizeDisplay ? String(item.prizeDisplay) : null,
          themes: Array.isArray(item.themes) ? item.themes.map(String) : [],
          techStack: Array.isArray(item.techStack) ? item.techStack.map(String) : [],
          registrationUrl,
          sourceUrl: registrationUrl,
          rawPayload: item,
        };
      });
    }

    // Default: Check Hack2Skill accessibility
    // Without a configured API feed key, per PRD Section 27, we attempt to verify connection
    // and provide safe fallback without breaking the multi-provider pipeline.
    try {
      const ping = await fetch(`${HACK2SKILL_BASE_URL}/hackathons`, {
        headers: { 'User-Agent': 'HackMate/1.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (!ping.ok) {
        throw new Error(`Hack2Skill returned status ${ping.status}`);
      }

      // Empty listing until authorized feed or partner integration is plugged in
      return [];
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Hack2Skill connection failed';
      throw new Error(`UPSTREAM_TIMEOUT: ${errorMsg}`);
    }
  }
}
