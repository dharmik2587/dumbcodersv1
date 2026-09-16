import type { HackathonProvider, NormalizedHackathon, ProviderHealth } from './types';

const HACK2SKILL_PUBLIC_API = 'https://hack2skill.com/api/v1/innovator/public/event/public-list';
const HACK2SKILL_BASE_URL = 'https://hack2skill.com';

export class Hack2SkillProvider implements HackathonProvider {
  name = 'hack2skill';

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    const feedUrl = process.env.HACK2SKILL_FEED_URL || `${HACK2SKILL_PUBLIC_API}?records=1&page=1`;

    try {
      const res = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'HackMate/1.0',
          Accept: 'application/json',
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
    const feedUrl = process.env.HACK2SKILL_FEED_URL || `${HACK2SKILL_PUBLIC_API}?records=30&page=1`;

    try {
      const res = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'HackMate/1.0',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        throw new Error(`Hack2Skill upstream returned HTTP ${res.status}`);
      }

      const json = await res.json();
      const items: Array<Record<string, unknown>> = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];

      const results: NormalizedHackathon[] = [];

      for (const item of items) {
        const sourceId = String(item._id || item.id || item.eventUrl || item.slug || '').trim();
        if (!sourceId) continue;

        const title = String(item.title || item.name || 'Hack2Skill Hackathon').trim();
        const slug = String(item.eventUrl || item.slug || '').trim();
        const registrationUrl = slug
          ? `${HACK2SKILL_BASE_URL}/event/${slug.replace(/^\/+/, '')}`
          : typeof item.registrationUrl === 'string' && item.registrationUrl
          ? item.registrationUrl
          : `${HACK2SKILL_BASE_URL}/hackathons/${sourceId}`;

        const modeRaw = String(item.mode || 'ONLINE').toUpperCase();
        const mode = modeRaw.includes('PERSON') || modeRaw.includes('OFFLINE')
          ? 'offline'
          : modeRaw.includes('HYBRID')
          ? 'hybrid'
          : 'online';

        const startAt = item.submissionStart || item.registrationStart || item.startAt || null;
        const endAt = item.submissionEnd || item.registrationEnd || item.endAt || null;
        const deadline = item.registrationEnd || item.registrationDeadlineAt || endAt || null;

        results.push({
          source: 'hack2skill',
          sourceId,
          title,
          description: typeof item.description === 'string'
            ? item.description
            : `Hack2Skill hackathon: ${title}. Mode: ${mode}.`,
          organizer: typeof item.organizer === 'string'
            ? item.organizer
            : typeof item.flag === 'string' && item.flag
            ? `Hack2Skill ${item.flag}`
            : 'Hack2Skill Community',
          startAt: startAt ? new Date(String(startAt)).toISOString() : null,
          endAt: endAt ? new Date(String(endAt)).toISOString() : null,
          registrationDeadlineAt: deadline ? new Date(String(deadline)).toISOString() : null,
          timezone: 'Asia/Kolkata',
          mode,
          location: typeof item.location === 'string' ? item.location : null,
          teamSizeMin: typeof item.teamSizeMin === 'number' ? item.teamSizeMin : 1,
          teamSizeMax: typeof item.teamSizeMax === 'number' ? item.teamSizeMax : 4,
          prizeAmount: typeof item.prizeAmount === 'number' ? item.prizeAmount : null,
          prizeCurrency: 'INR',
          prizeDisplay: item.prizeDisplay ? String(item.prizeDisplay) : null,
          themes: Array.isArray(item.themes) ? item.themes.map(String) : ['Hackathon'],
          techStack: Array.isArray(item.techStack) ? item.techStack.map(String) : [],
          registrationUrl,
          sourceUrl: registrationUrl,
          rawPayload: item,
        });
      }

      return results;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Hack2Skill connection failed';
      throw new Error(`UPSTREAM_TIMEOUT: ${errorMsg}`);
    }
  }
}
