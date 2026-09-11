import { DevfolioProvider } from './devfolio';
import { Hack2SkillProvider } from './hack2skill';
import type { HackathonProvider, NormalizedHackathon, ProviderHealth, ProviderSyncSummary } from './types';
import { UnstopProvider } from './unstop';

export * from './types';
export { DevfolioProvider } from './devfolio';
export { Hack2SkillProvider } from './hack2skill';
export { UnstopProvider } from './unstop';

export function getProviders(): HackathonProvider[] {
  return [new UnstopProvider(), new DevfolioProvider(), new Hack2SkillProvider()];
}

export async function checkAllProvidersHealth(): Promise<Record<string, ProviderHealth>> {
  const providers = getProviders();
  const results: Record<string, ProviderHealth> = {};

  const settled = await Promise.allSettled(
    providers.map(async (p) => {
      if (p.healthCheck) {
        return p.healthCheck();
      }
      return {
        provider: p.name,
        status: 'healthy' as const,
        latencyMs: 0,
        lastCheckedAt: new Date().toISOString(),
      };
    })
  );

  settled.forEach((res, index) => {
    const name = providers[index].name;
    if (res.status === 'fulfilled') {
      results[name] = res.value;
    } else {
      results[name] = {
        provider: name,
        status: 'down',
        latencyMs: 0,
        lastCheckedAt: new Date().toISOString(),
        error: res.reason instanceof Error ? res.reason.message : 'Health check failed',
      };
    }
  });

  return results;
}
