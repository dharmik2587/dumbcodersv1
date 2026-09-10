import { getRedis } from './redis';
import { Ratelimit } from '@upstash/ratelimit';
import { failure } from './http';

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function checkMemoryRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { success: true, remaining: limit - 1, reset: now + windowSeconds * 1000 };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, reset: record.resetAt };
  }

  record.count += 1;
  return { success: true, remaining: limit - record.count, reset: record.resetAt };
}

// Cache of Upstash Ratelimit instances by limit + window
const ratelimitCache = new Map<string, Ratelimit>();

export async function checkRateLimit(
  key: string,
  limit = 20,
  windowSeconds = 60,
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const redis = getRedis();

  if (redis) {
    try {
      const cacheKey = `${limit}:${windowSeconds}`;
      let limiter = ratelimitCache.get(cacheKey);
      if (!limiter) {
        limiter = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
          analytics: true,
          prefix: '@hackmate/ratelimit',
        });
        ratelimitCache.set(cacheKey, limiter);
      }

      const result = await limiter.limit(key);
      return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (err) {
      console.warn('[RateLimit] Upstash Redis error, falling back to memory:', err);
    }
  }

  return checkMemoryRateLimit(key, limit, windowSeconds);
}

export async function enforceRateLimit(
  key: string,
  limit = 20,
  windowSeconds = 60,
): Promise<{ success: boolean; response?: Response }> {
  const result = await checkRateLimit(key, limit, windowSeconds);
  if (!result.success) {
    const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    return {
      success: false,
      response: failure(
        'RATE_LIMITED',
        `Too many requests. Please try again in ${retryAfter} seconds.`,
        429,
        {
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
          },
        },
      ),
    };
  }

  return { success: true };
}
