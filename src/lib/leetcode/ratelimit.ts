const memoryStore = new Map<string, { count: number; resetAt: number }>();

/**
 * In-memory fallback and helper rate-limiter for verification endpoints.
 * Limits to `maxRequests` per `windowSeconds` per key.
 */
export function checkRateLimit(key: string, maxRequests = 10, windowSeconds = 60): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { success: true, remaining: maxRequests - 1, reset: now + windowSeconds * 1000 };
  }

  if (record.count >= maxRequests) {
    return { success: false, remaining: 0, reset: record.resetAt };
  }

  record.count += 1;
  return { success: true, remaining: maxRequests - record.count, reset: record.resetAt };
}
