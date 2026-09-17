import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { getCoreDb } from '../src/lib/db/core';

async function main() {
  const sqlFilePath = path.join(process.cwd(), 'drizzle', '0007_moaning_switch.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  // Split on statement-breakpoint
  const statements = sqlContent
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`Applying ${statements.length} migration statements...`);
  const db = getCoreDb();

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`[${i + 1}/${statements.length}] Executing statement...`);
    try {
      await db.execute(sql.raw(stmt));
      console.log(`[${i + 1}/${statements.length}] Done.`);
    } catch (err: any) {
      if (err?.message?.includes('already exists')) {
        console.log(`[${i + 1}/${statements.length}] Already exists, skipping.`);
      } else {
        console.error(`[${i + 1}/${statements.length}] Error:`, err);
        throw err;
      }
    }
  }

  console.log('Migration successfully applied!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
