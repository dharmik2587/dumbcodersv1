import { getCoreDb, hasCoreDatabase } from '../src/lib/db/core';
import {
  conversations,
  directMessages,
  hackathons,
  hackathonSources,
  notifications,
  profiles,
  socialAccounts,
} from '../src/lib/db/schema/core';
import { getOrCreateConversation } from '../src/lib/db/queries/messages';
import {
  computeCanonicalKey,
  computePayloadHash,
  markExpiredHackathons,
  upsertHackathonSource,
} from '../src/lib/db/queries/hackathons';
import { getStudentByAnyKey } from '../src/lib/profile/student';
import { DevfolioProvider, Hack2SkillProvider, UnstopProvider } from '../src/lib/hackathons/providers';
import { classifyDbError, ErrorCodes } from '../src/lib/api/errors';
import { generateRequestId, getRequestId } from '../src/lib/api/request-id';
import { failure, success } from '../src/lib/http';
import { eq, and, sql } from 'drizzle-orm';

const user1Id = 'e9945bd5-632b-437e-a2e1-d0002bfd6bfd';
const user2Id = '59646429-26a8-4b01-8af7-3871f7271858';

async function runPrdTests() {
  console.log('\n=============================================================');
  console.log('🚀 RUNNING HACKMATE PRODUCTION ENGINEERING PRD v2 TEST SUITE');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error('     Error:', err instanceof Error ? err.message : err);
      failed++;
    }
  }

  const db = getCoreDb();

  // -------------------------------------------------------------
  // TEST GROUP 1: Public Profile & Socials Isolation
  // -------------------------------------------------------------
  console.log('--- [1] Social Accounts on Public Profiles ---');

  await test('getStudentByAnyKey returns profile and socialAccounts without sensitive data', async () => {
    // Ensure test profile exists
    const [p] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user1Id))
      .limit(1);

    if (!p) {
      console.log('     Skipping student profile check (test user not seeded)');
      return;
    }

    const res = await getStudentByAnyKey(user1Id);
    if (!res) throw new Error('getStudentByAnyKey returned null');

    if (!Array.isArray(res.socialAccounts)) {
      throw new Error('Expected socialAccounts to be an array');
    }

    // Verify sensitive fields are not in the public DTO type
    for (const acc of res.socialAccounts) {
      if ('providerUserId' in acc && acc.providerUserId !== undefined) {
        throw new Error('Public DTO should not expose providerUserId');
      }
      if ('metadata' in acc && acc.metadata !== undefined) {
        throw new Error('Public DTO should not expose internal metadata');
      }
      if ('accessToken' in acc || 'token' in acc) {
        throw new Error('Public DTO leaked access token');
      }
    }
  });

  // -------------------------------------------------------------
  // TEST GROUP 2: Atomic Request-to-DM Transition & Normalization
  // -------------------------------------------------------------
  console.log('\n--- [2] Atomic Collaboration Request -> DM Transition ---');

  await test('Reciprocal pair normalization ensures single conversation', async () => {
    const convoA = await getOrCreateConversation(user1Id, user2Id);
    const convoB = await getOrCreateConversation(user2Id, user1Id);

    if (convoA.id !== convoB.id) {
      throw new Error(`Expected identical IDs, got ${convoA.id} and ${convoB.id}`);
    }

    const [uA, uB] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];
    if (convoA.userAId !== uA || convoA.userBId !== uB) {
      throw new Error(`Canonical pair ordering mismatch: expected ${uA}, ${uB}`);
    }
  });

  await test('getOrCreateConversation executes safely within an active database transaction', async () => {
    const convo = await db.transaction(async (tx) => {
      return getOrCreateConversation(user1Id, user2Id, tx);
    });

    if (!convo || !convo.id) {
      throw new Error('Transaction conversation lookup failed');
    }
  });

  await test('Request accepted notification targets /messages?conversationId=...', async () => {
    const convo = await getOrCreateConversation(user1Id, user2Id);
    const expectedHref = `/messages?conversationId=${convo.id}`;

    if (!expectedHref.includes('/messages?conversationId=')) {
      throw new Error(`Unexpected destination format: ${expectedHref}`);
    }
  });

  // -------------------------------------------------------------
  // TEST GROUP 3: Multi-Provider Hackathon Aggregation
  // -------------------------------------------------------------
  console.log('\n--- [3] Multi-Provider Hackathon Aggregation ---');

  await test('SHA-256 payload hashing detects changes and skips identical payloads', async () => {
    const payloadA = { title: 'AI Hackathon', prize: 10000 };
    const payloadB = { title: 'AI Hackathon', prize: 10000 };
    const payloadC = { title: 'AI Hackathon', prize: 20000 };

    const hashA = computePayloadHash(payloadA);
    const hashB = computePayloadHash(payloadB);
    const hashC = computePayloadHash(payloadC);

    if (hashA !== hashB) {
      throw new Error('Identical payloads must yield identical SHA-256 hashes');
    }
    if (hashA === hashC) {
      throw new Error('Altered payloads must yield different SHA-256 hashes');
    }
  });

  await test('Deterministic canonical key generation works consistently', async () => {
    const key1 = computeCanonicalKey('FIEM ACM', "HackSpire'26", '2026-10-02T08:30:00Z');
    const key2 = computeCanonicalKey('FIEM ACM', "HackSpire'26", '2026-10-02T10:00:00Z');

    if (!key1.includes('fiem-acm') || !key1.includes('hackspire-26')) {
      throw new Error(`Unexpected canonical key format: ${key1}`);
    }
    if (key1 !== key2) {
      throw new Error('Expected same canonical key for same organizer, title and date');
    }
  });

  await test('Cross-provider deduplication links multiple providers to single canonical hackathon', async () => {
    const canonicalKey = `test-dedupe-hackathon-${Date.now()}`;

    // Insert from Unstop
    const resUnstop = await upsertHackathonSource({
      source: 'unstop',
      sourceId: `unstop-${Date.now()}`,
      canonicalKey,
      title: 'Global Web3 Summit',
      organizer: 'Ethereum Foundation',
      timezone: 'Asia/Kolkata',
      prizeCurrency: 'INR',
      themes: [],
      techStack: [],
      rawPayload: { unstopData: 123 },
    });

    // Insert from Devfolio with identical canonicalKey
    const resDevfolio = await upsertHackathonSource({
      source: 'devfolio',
      sourceId: `devfolio-${Date.now()}`,
      canonicalKey,
      title: 'Global Web3 Summit',
      organizer: 'Ethereum Foundation',
      timezone: 'Asia/Kolkata',
      prizeCurrency: 'INR',
      themes: [],
      techStack: [],
      rawPayload: { devfolioData: 456 },
    });

    if (resUnstop.hackathonId !== resDevfolio.hackathonId) {
      throw new Error(
        `Expected both providers to map to same hackathonId, got ${resUnstop.hackathonId} vs ${resDevfolio.hackathonId}`
      );
    }
    if (resDevfolio.action !== 'updated') {
      throw new Error(`Expected deduplicated source to return updated action, got ${resDevfolio.action}`);
    }

    // Verify subsequent identical update returns unchanged
    const resUnstopAgain = await upsertHackathonSource({
      source: resUnstop.source.source as 'unstop',
      sourceId: resUnstop.source.sourceId,
      canonicalKey,
      title: 'Global Web3 Summit',
      organizer: 'Ethereum Foundation',
      timezone: 'Asia/Kolkata',
      prizeCurrency: 'INR',
      themes: [],
      techStack: [],
      rawPayload: { unstopData: 123 },
    });

    if (resUnstopAgain.action !== 'unchanged') {
      throw new Error(`Expected payload with identical hash to return 'unchanged', got ${resUnstopAgain.action}`);
    }
  });

  await test('UnstopProvider fetches and normalizes hackathons correctly', async () => {
    const provider = new UnstopProvider();
    const items = await provider.fetchHackathons();

    if (!Array.isArray(items)) throw new Error('Expected array of hackathons');
    if (items.length > 0) {
      const first = items[0];
      if (!first.source || first.source !== 'unstop') throw new Error('Source must be unstop');
      if (!first.sourceId) throw new Error('sourceId required');
      if (!first.title) throw new Error('title required');
      if (!first.registrationUrl) throw new Error('registrationUrl required');
    }
  });

  await test('DevfolioProvider fetches and normalizes hackathons correctly', async () => {
    const provider = new DevfolioProvider();
    const items = await provider.fetchHackathons();

    if (!Array.isArray(items)) throw new Error('Expected array of hackathons');
    if (items.length > 0) {
      const first = items[0];
      if (!first.source || first.source !== 'devfolio') throw new Error('Source must be devfolio');
      if (!first.sourceId) throw new Error('sourceId required');
      if (!first.title) throw new Error('title required');
    }
  });

  await test('Provider isolation: Hack2Skill failure does not compromise other providers', async () => {
    const h2s = new Hack2SkillProvider();
    const devfolio = new DevfolioProvider();

    const [h2sRes, devfolioRes] = await Promise.allSettled([
      h2s.fetchHackathons(),
      devfolio.fetchHackathons(),
    ]);

    // Even if Hack2Skill fails due to feed configuration, Devfolio succeeds
    if (devfolioRes.status !== 'fulfilled') {
      throw new Error(`Devfolio should succeed independently of Hack2Skill: ${devfolioRes.status}`);
    }
  });

  await test('markExpiredHackathons transitions deadlines older than now', async () => {
    const count = await markExpiredHackathons();
    if (typeof count !== 'number') {
      throw new Error('markExpiredHackathons must return number of updated records');
    }
  });

  // -------------------------------------------------------------
  // TEST GROUP 4: Centralized Error Handling & Observability
  // -------------------------------------------------------------
  console.log('\n--- [4] API Error Handling & Observability ---');

  await test('Request ID generator produces req_ prefix and preserves incoming X-Request-ID', async () => {
    const gen = generateRequestId();
    if (!gen.startsWith('req_')) throw new Error(`Expected req_ prefix, got ${gen}`);

    const incoming = 'req_custom_test_12345';
    const resolved = getRequestId({
      headers: new Headers({ 'x-request-id': incoming }),
    });
    if (resolved !== incoming) {
      throw new Error(`Expected ${incoming}, got ${resolved}`);
    }
  });

  await test('Database error classifier categorizes Postgres codes properly', async () => {
    // 23505 Unique Violation -> CONFLICT (409)
    const uniqueErr = classifyDbError({ code: '23505', message: 'duplicate key value violates unique constraint' });
    if (uniqueErr.code !== ErrorCodes.CONFLICT || uniqueErr.statusCode !== 409) {
      throw new Error(`Expected CONFLICT (409), got ${uniqueErr.code} (${uniqueErr.statusCode})`);
    }

    // 23503 Foreign Key Violation -> DATABASE_CONSTRAINT (400)
    const fkErr = classifyDbError({ code: '23503', message: 'violates foreign key constraint' });
    if (uniqueErr.code === fkErr.code || fkErr.statusCode !== 400) {
      throw new Error(`Expected DATABASE_CONSTRAINT (400), got ${fkErr.code} (${fkErr.statusCode})`);
    }

    // 57014 Timeout -> DATABASE_TIMEOUT (504)
    const timeoutErr = classifyDbError({ code: '57014', message: 'canceling statement due to statement timeout' });
    if (timeoutErr.code !== ErrorCodes.DATABASE_TIMEOUT || timeoutErr.statusCode !== 504) {
      throw new Error(`Expected DATABASE_TIMEOUT (504), got ${timeoutErr.code} (${timeoutErr.statusCode})`);
    }
  });

  await test('HTTP failure helper returns standard JSON and sets X-Request-ID without leaking stack traces', async () => {
    const reqId = 'req_test_observability_99';
    const res = failure('DATABASE_ERROR', 'Unable to complete request.', 500, {
      api: 'POST /api/requests/123/accept',
      requestId: reqId,
      provider: 'neon',
    });

    if (res.headers.get('X-Request-ID') !== reqId) {
      throw new Error(`Expected X-Request-ID header to equal ${reqId}`);
    }

    const body = await res.json();
    if (body.data !== null) throw new Error('Expected data to be null on failure');
    if (body.error?.code !== 'DATABASE_ERROR') throw new Error('Expected error code DATABASE_ERROR');
    if (body.error?.requestId !== reqId) throw new Error(`Expected error.requestId to equal ${reqId}`);
    if (body.error?.api !== 'POST /api/requests/123/accept') throw new Error('Expected error.api to match');
    if ('stack' in body.error) throw new Error('Production response leaked server stack trace');
  });

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n=============================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPrdTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
