import type { HackathonProvider, NormalizedHackathon, ProviderHealth } from './types';

const DEVFOLIO_API = 'https://api.devfolio.co/api/hackathons';

export class DevfolioProvider implements HackathonProvider {
  name = 'devfolio';

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const res = await fetch(`${DEVFOLIO_API}?filter=application_open&page=1&limit=1`, {
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
        status: 'down',
        latencyMs: Date.now() - start,
        lastCheckedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Devfolio health check failed',
      };
    }
  }

  async fetchHackathons(): Promise<NormalizedHackathon[]> {
    const results: NormalizedHackathon[] = [];
    const filters = ['application_open', 'upcoming'];

    for (const filter of filters) {
      try {
        const url = `${DEVFOLIO_API}?filter=${filter}&page=1&limit=30`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
          console.warn(`Devfolio fetch for filter ${filter} returned HTTP ${res.status}`);
          continue;
        }

        const json = await res.json();
        const items: Array<Record<string, unknown>> = Array.isArray(json.result) ? json.result : [];

        for (const item of items) {
          const sourceId = String(item.uuid || item.slug || '').trim();
          if (!sourceId) continue;

          // Prevent duplicates across filters
          if (results.some((r) => r.sourceId === sourceId)) continue;

          const title = String(item.name || 'Devfolio Hackathon').trim();
          const slug = String(item.slug || sourceId).trim();
          const sourceUrl = slug ? `https://${slug}.devfolio.co` : `https://devfolio.co/hackathons/${sourceId}`;
          const organizer = typeof item.hackathon_brand === 'string'
            ? item.hackathon_brand
            : typeof item.edition_name === 'string'
            ? item.edition_name
            : 'Devfolio Community';

          const themes: string[] = [];
          if (Array.isArray(item.themes)) {
            for (const t of item.themes) {
              if (typeof t === 'string') themes.push(t);
              else if (typeof t === 'object' && t && 'name' in t) themes.push(String((t as { name: unknown }).name));
            }
          }

          const isOnline = item.is_online === true;
          const location = typeof item.location === 'string' ? item.location : typeof item.city === 'string' ? item.city : null;

          results.push({
            source: 'devfolio',
            sourceId,
            title,
            description: typeof item.desc === 'string' ? item.desc.slice(0, 2000) : (typeof item.tagline === 'string' ? item.tagline : null),
            organizer,
            startAt: item.starts_at ? new Date(String(item.starts_at)).toISOString() : null,
            endAt: item.ends_at ? new Date(String(item.ends_at)).toISOString() : null,
            registrationDeadlineAt: item.ends_at ? new Date(String(item.ends_at)).toISOString() : null,
            timezone: typeof item.timezone === 'string' ? item.timezone : 'Asia/Kolkata',
            mode: isOnline ? 'online' : 'offline',
            location,
            teamSizeMin: typeof item.team_min === 'number' ? item.team_min : 1,
            teamSizeMax: typeof item.team_size === 'number' ? item.team_size : 4,
            prizeAmount: null,
            prizeCurrency: 'INR',
            prizeDisplay: null,
            themes,
            techStack: [],
            registrationUrl: sourceUrl,
            sourceUrl,
            rawPayload: item,
          });
        }
      } catch (filterError) {
        console.warn(`Devfolio error for filter ${filter}:`, filterError);
      }
    }

    return results;
  }
}
