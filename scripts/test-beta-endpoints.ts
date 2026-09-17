import { getCoreDb } from '../src/lib/db/core';
import { createProblemReport, listProblemReports } from '../src/lib/db/queries/reports';
import { createCareerApplication, listCareerApplications } from '../src/lib/db/queries/careers';
import { problemReports, careerApplications } from '../src/lib/db/schema/core';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Testing Beta Productization database queries...');

  // Test 1: Problem Report
  console.log('[1/4] Inserting test problem report...');
  const report = await createProblemReport({
    category: 'broken_feature',
    description: 'Automated test problem report: verification test for beta productization pipeline.',
    email: 'test-reporter@college.edu',
    pageUrl: '/hackathons/test-slug',
    userAgent: 'Node-Test-Runner/1.0',
  });

  console.log(`[1/4] Problem report inserted: ID=${report.id}, Status=${report.status}, Category=${report.category}`);

  // Test 2: List Reports
  console.log('[2/4] Verifying problem report in list...');
  const reportsList = await listProblemReports(10);
  const foundReport = reportsList.find((r) => r.id === report.id);
  if (!foundReport) {
    throw new Error('Could not find inserted problem report in list!');
  }
  console.log(`[2/4] Verified! Total reports retrieved: ${reportsList.length}`);

  // Test 3: Career Application
  console.log('[3/4] Inserting test career application...');
  const application = await createCareerApplication({
    name: 'Priyansh Contributor',
    email: 'priyansh@campus.edu',
    role: 'frontend',
    githubUrl: 'https://github.com/student-dev',
    portfolioUrl: 'https://student-dev.tech',
    message: 'I would love to help improve the HackMate matching UI and team composition components.',
  });

  console.log(`[3/4] Career application inserted: ID=${application.id}, Status=${application.status}, Role=${application.role}`);

  // Test 4: List Career Applications
  console.log('[4/4] Verifying career application in list...');
  const appsList = await listCareerApplications(10);
  const foundApp = appsList.find((a) => a.id === application.id);
  if (!foundApp) {
    throw new Error('Could not find inserted career application in list!');
  }
  console.log(`[4/4] Verified! Total applications retrieved: ${appsList.length}`);

  // Cleanup test rows
  console.log('Cleaning up test rows...');
  const db = getCoreDb();
  await db.delete(problemReports).where(eq(problemReports.id, report.id));
  await db.delete(careerApplications).where(eq(careerApplications.id, application.id));
  console.log('Cleaned up successfully.');

  console.log('\nAll Beta Productization database tests PASSED successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
