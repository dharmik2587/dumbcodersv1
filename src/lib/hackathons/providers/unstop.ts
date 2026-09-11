import type { HackathonProvider, NormalizedHackathon, ProviderHealth } from './types';

const UNSTOP_API = 'https://unstop.com/api/public/opportunity/search-result';
const UNSTOP_BASE_URL = 'https://unstop.com';

function cleanNumericPrize(raw: unknown): number | null {
  if (!raw) return null;
  const str = String(raw).replace(/[^0-9.]/g, '');
  const val = parseFloat(str);
  return Number.isFinite(val) ? val : null;
}

export class UnstopProvider implements HackathonProvider {
  name = 'unstop';

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const res = await fetch(`${UNSTOP_API}?opportunity=hackathons&per_page=1&page=1&oppstatus=open`, {
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
        error: err instanceof Error ? err.message : 'Unstop health check failed',
      };
    }
  }

  async fetchHackathons(): Promise<NormalizedHackathon[]> {
    const results: NormalizedHackathon[] = [];
    const url = `${UNSTOP_API}?opportunity=hackathons&per_page=30&page=1&oppstatus=open`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`Unstop API failed with status ${res.status}`);
    }

    const json = await res.json();
    const dataObj = json.data;
    const items: Array<Record<string, unknown>> = Array.isArray(dataObj?.data)
      ? dataObj.data
      : Array.isArray(dataObj)
      ? dataObj
      : [];

    for (const item of items) {
      const sourceId = String(item.id || item.slug || item.short_id || '').trim();
      if (!sourceId) continue;

      const title = String(item.title || item.name || 'Unstop Hackathon').trim();
      const slug = String(item.seo_url || item.public_url || item.slug || '').trim();
      const registrationUrl = slug.startsWith('http')
        ? slug
        : slug
        ? `${UNSTOP_BASE_URL}/${slug.replace(/^\/+/, '')}`
        : `${UNSTOP_BASE_URL}/hackathons/${sourceId}`;

      let organizer = 'Unstop Organizer';
      if (typeof item.organisation === 'object' && item.organisation && 'name' in item.organisation) {
        organizer = String((item.organisation as { name?: unknown }).name || organizer);
      } else if (typeof item.organisation === 'string' && item.organisation) {
        organizer = item.organisation;
      } else if (item.author) {
        organizer = String(item.author);
      }

      const regReq = (typeof item.regnRequirements === 'object' && item.regnRequirements)
        ? (item.regnRequirements as Record<string, unknown>)
        : {};

      const deadline = regReq.end_regn_dt || item.end_date || item.register_end_date;
      const startAt = item.start_date || regReq.start_regn_dt || null;
      const endAt = item.end_date || null;

      const rawPrize = item.prizes || (item.prizes_summary as Record<string, unknown>)?.total_prize;
      const prizeAmount = cleanNumericPrize(rawPrize);

      results.push({
        source: 'unstop',
        sourceId,
        title,
        description: typeof item.details === 'string' ? item.details.replace(/<[^>]+>/g, ' ').slice(0, 2000).trim() : null,
        organizer,
        startAt: startAt ? new Date(String(startAt)).toISOString() : null,
        endAt: endAt ? new Date(String(endAt)).toISOString() : null,
        registrationDeadlineAt: deadline ? new Date(String(deadline)).toISOString() : null,
        timezone: 'Asia/Kolkata',
        mode: String(item.region || 'online').toLowerCase().includes('offline') ? 'offline' : 'online',
        location: typeof item.city === 'string' ? item.city : null,
        teamSizeMin: typeof item.min_team_size === 'number' ? item.min_team_size : 1,
        teamSizeMax: typeof item.max_team_size === 'number' ? item.max_team_size : 4,
        prizeAmount,
        prizeCurrency: 'INR',
        prizeDisplay: prizeAmount ? `₹${prizeAmount.toLocaleString('en-IN')}` : null,
        themes: Array.isArray(item.filters) ? item.filters.map(String) : [],
        techStack: [],
        registrationUrl,
        sourceUrl: registrationUrl,
        rawPayload: item,
      });
    }

    return results;
  }
}
