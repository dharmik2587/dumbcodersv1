import { getCoreDb } from '../src/lib/db/core';
import { listHackathons, getHackathonById } from '../src/lib/db/queries/hackathons';
import { hackathonSources } from '../src/lib/db/schema/core';
import { eq } from 'drizzle-orm';
import { GET as registerRoute } from '../src/app/api/hackathons/[id]/register/route';
import { NextRequest } from 'next/server';

async function runTests() {
  console.log('=== VERIFYING PROVIDER INTEGRATION & REGISTRATION REDIRECTION ===\n');
  const db = getCoreDb();

  const providers = ['unstop', 'devfolio', 'hack2skill'] as const;

  for (const p of providers) {
    console.log(`Testing provider: [${p.toUpperCase()}]`);

    // 1. Check hackathon_sources in DB
    const sources = await db
      .select()
      .from(hackathonSources)
      .where(eq(hackathonSources.source, p))
      .limit(3);

    if (sources.length === 0) {
      throw new Error(`FAIL: No ${p} records found in database!`);
    }

    console.log(`  ✓ Found ${sources.length}+ records in hackathon_sources for ${p}`);

    // 2. Fetch canonical hackathon
    const sampleSource = sources[0];
    const hackathon = await getHackathonById(sampleSource.hackathonId);
    if (!hackathon) {
      throw new Error(`FAIL: Canonical hackathon ${sampleSource.hackathonId} not found!`);
    }

    console.log(`  ✓ Canonical hackathon retrieved: "${hackathon.title}"`);
    console.log(`  ✓ Source verified: "${(hackathon as any).source}"`);
    console.log(`  ✓ Target registration URL: "${hackathon.registrationUrl}"`);

    if (!hackathon.registrationUrl) {
      throw new Error(`FAIL: Hackathon ${hackathon.id} has no registrationUrl`);
    }

    // 3. Test Registration Redirection Endpoint
    const fakeRequest = new NextRequest(`http://localhost:3000/api/hackathons/${hackathon.id}/register`);
    const paramsPromise = Promise.resolve({ id: hackathon.id });
    const response = await registerRoute(fakeRequest, { params: paramsPromise });

    const status = response.status;
    const location = response.headers.get('location');

    console.log(`  ✓ /api/hackathons/${hackathon.id}/register -> HTTP ${status}`);
    console.log(`  ✓ Redirect Location: ${location}`);

    if (status !== 302 && status !== 307 && status !== 308) {
      throw new Error(`FAIL: Expected HTTP redirect (302), got ${status}`);
    }

    if (!location || !location.startsWith('http')) {
      throw new Error(`FAIL: Invalid redirect location: ${location}`);
    }

    // Verify location domain
    if (p === 'devfolio' && !location.includes('devfolio.co')) {
      throw new Error(`FAIL: Devfolio redirect location should contain devfolio.co: ${location}`);
    }
    if (p === 'unstop' && !location.includes('unstop.com')) {
      throw new Error(`FAIL: Unstop redirect location should contain unstop.com: ${location}`);
    }
    if (p === 'hack2skill' && !location.includes('hack2skill.com')) {
      throw new Error(`FAIL: Hack2Skill redirect location should contain hack2skill.com: ${location}`);
    }

    console.log(`  ✅ ${p.toUpperCase()} redirection verified successfully!\n`);
  }

  // 4. Test listHackathons query filtering
  console.log('Testing listHackathons source filtering:');
  for (const p of providers) {
    const list = await listHackathons({ source: p, page: 1, pageSize: 5 });
    console.log(`  ✓ listHackathons({ source: '${p}' }) -> total: ${list.total}, returned: ${list.rows.length}`);
    if (list.rows.length === 0) {
      throw new Error(`FAIL: listHackathons returned 0 rows for source ${p}`);
    }
    for (const item of list.rows) {
      if ((item as any).source !== p) {
        throw new Error(`FAIL: Expected row source ${p}, got ${(item as any).source}`);
      }
    }
    console.log(`  ✅ All ${list.rows.length} rows have source === '${p}'`);
  }

  console.log('\n=============================================================');
  console.log('🎉 ALL INTEGRATION & REGISTRATION REDIRECTION TESTS PASSED!');
  console.log('=============================================================');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
