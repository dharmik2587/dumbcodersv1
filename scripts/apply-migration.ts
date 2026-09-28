import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { getCoreDb } from '../src/lib/db/core';

async function cleanupPendingDuplicates() {
  const db = getCoreDb();
  console.log('Cleaning up any duplicate pending team_requests before index creation...');
  await db.execute(sql.raw(`
    DELETE FROM team_requests a USING team_requests b
    WHERE a.id < b.id
      AND a.from_user_id = b.from_user_id
      AND a.to_user_id = b.to_user_id
      AND a.status = 'pending'
      AND b.status = 'pending';
  `));
  console.log('Duplicate pending requests cleaned up.');
}

async function applyFile(fileName: string) {
  const sqlFilePath = path.join(process.cwd(), 'drizzle', fileName);
  if (!fs.existsSync(sqlFilePath)) return;

  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  const statements = sqlContent
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`\nApplying migration ${fileName} (${statements.length} statements)...`);
  const db = getCoreDb();

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`[${i + 1}/${statements.length}] Executing statement: ${stmt.slice(0, 60)}...`);
    try {
      await db.execute(sql.raw(stmt));
      console.log(`[${i + 1}/${statements.length}] Done.`);
    } catch (err: any) {
      const errStr = `${err?.message || ''} ${err?.cause?.message || ''} ${String(err)}`;
      if (errStr.includes('already exists') || errStr.includes('duplicate')) {
        console.log(`[${i + 1}/${statements.length}] Already exists / duplicate, skipping.`);
      } else {
        console.error(`[${i + 1}/${statements.length}] Error:`, err);
        throw err;
      }
    }
  }
}

async function main() {
  await cleanupPendingDuplicates();
  await applyFile('0006_parallel_richard_fisk.sql');
  await applyFile('0007_moaning_switch.sql');
  console.log('\nMigration run completed successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
