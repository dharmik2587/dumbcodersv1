import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

let redisInstance: Redis | null = null;

export function getRedis(): Redis | null {
  if (redisInstance) return redisInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  redisInstance = new Redis({
    url: url.trim().replace(/^["']|["']$/g, ''),
    token: token.trim().replace(/^["']|["']$/g, ''),
  });

  return redisInstance;
}

export function hasRedis(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export function createRatelimit(requests = 20, window: Parameters<typeof Ratelimit.slidingWindow>[1] = '60 s') {
  const redis = getRedis();
  if (!redis) return null;

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix: '@hackmate/ratelimit',
  });
}
