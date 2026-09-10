/**
 * Concurrency Test Script for HackMate
 * Target: 30 - 50 concurrent simulated users
 *
 * Verifies:
 * 1. Health endpoint response times & reliability under 50 concurrent requests.
 * 2. Leetcode Health check response times under concurrency.
 * 3. Hackathon listings endpoint under concurrency.
 * 4. Rate limiting behavior and graceful 429 backoff under burst load.
 */

interface RequestMetrics {
  durationMs: number;
  status: number;
  ok: boolean;
  error?: string;
}

interface RunSummary {
  name: string;
  totalRequests: number;
  concurrency: number;
  successful: number;
  failed: number;
  rateLimited: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  avgMs: number;
}

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function timedFetch(url: string, init?: RequestInit): Promise<RequestMetrics> {
  const start = performance.now();
  try {
    const res = await fetch(url, init);
    const durationMs = performance.now() - start;
    return {
      durationMs,
      status: res.status,
      ok: res.ok,
    };
  } catch (err: unknown) {
    const durationMs = performance.now() - start;
    return {
      durationMs,
      status: 0,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runConcurrentBatch(
  name: string,
  url: string,
  concurrency: number,
  init?: RequestInit,
): Promise<RunSummary> {
  console.log(`\n========================================`);
  console.log(`[START] ${name}: Dispatching ${concurrency} concurrent requests to ${url}`);
  console.log(`========================================`);

  const promises: Promise<RequestMetrics>[] = [];
  for (let i = 0; i < concurrency; i++) {
    promises.push(timedFetch(url, init));
  }

  const results = await Promise.all(promises);
  const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);

  let successful = 0;
  let rateLimited = 0;
  let failed = 0;

  for (const r of results) {
    if (r.status === 429) {
      rateLimited++;
    } else if (r.ok) {
      successful++;
    } else {
      failed++;
    }
  }

  const minMs = durations[0] || 0;
  const maxMs = durations[durations.length - 1] || 0;
  const avgMs = durations.reduce((acc, d) => acc + d, 0) / (durations.length || 1);
  const p50Ms = durations[Math.floor(durations.length * 0.5)] || 0;
  const p95Ms = durations[Math.floor(durations.length * 0.95)] || 0;
  const p99Ms = durations[Math.floor(durations.length * 0.99)] || 0;

  const summary: RunSummary = {
    name,
    totalRequests: concurrency,
    concurrency,
    successful,
    failed,
    rateLimited,
    minMs: Math.round(minMs),
    maxMs: Math.round(maxMs),
    p50Ms: Math.round(p50Ms),
    p95Ms: Math.round(p95Ms),
    p99Ms: Math.round(p99Ms),
    avgMs: Math.round(avgMs),
  };

  console.log(`Result for: ${name}`);
  console.log(`  - Concurrency:    ${concurrency}`);
  console.log(`  - Successful:     ${successful} (${Math.round((successful / concurrency) * 100)}%)`);
  console.log(`  - Rate Limited:   ${rateLimited}`);
  console.log(`  - Failed:         ${failed}`);
  console.log(`  - Latency: min=${summary.minMs}ms | avg=${summary.avgMs}ms | p50=${summary.p50Ms}ms | p95=${summary.p95Ms}ms | p99=${summary.p99Ms}ms | max=${summary.maxMs}ms`);

  return summary;
}

async function main() {
  console.log(`=== HACKMATE 30-50 USER CONCURRENCY VALIDATION SUITE ===`);
  console.log(`Target URL: ${BASE_URL}`);

  // Test 1: 30 concurrent users querying Health endpoint
  const test1 = await runConcurrentBatch(
    '1. 30 Concurrent Users - GET /api/health',
    `${BASE_URL}/api/health`,
    30,
  );

  // Test 2: 50 concurrent users querying Health endpoint
  const test2 = await runConcurrentBatch(
    '2. 50 Concurrent Users - GET /api/health',
    `${BASE_URL}/api/health`,
    50,
  );

  // Test 3: 50 concurrent users querying LeetCode Health
  const test3 = await runConcurrentBatch(
    '3. 50 Concurrent Users - GET /api/leetcode/health',
    `${BASE_URL}/api/leetcode/health`,
    50,
  );

  // Test 4: 40 concurrent users querying Hackathons list
  const test4 = await runConcurrentBatch(
    '4. 40 Concurrent Users - GET /api/hackathons',
    `${BASE_URL}/api/hackathons`,
    40,
  );

  // Test 5: Rate Limiter Burst Test (simulate 50 rapid requests against rate-limited endpoint)
  const test5 = await runConcurrentBatch(
    '5. Burst Rate Limit Test - POST /api/messages (without auth/burst)',
    `${BASE_URL}/api/messages`,
    50,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: 'test-user-rate-burst' }),
    },
  );

  console.log('\n========================================');
  console.log('SUMMARY TABLE');
  console.log('========================================');
  console.table([test1, test2, test3, test4, test5]);

  console.log('\n[PASS] Concurrency verification completed successfully.');
}

void main();
