/**
 * HackMate database doctor.
 *
 *   pnpm db:doctor          -> read-only diagnosis (the only write test is rolled back)
 *   pnpm db:doctor --fix    -> first applies drizzle/0008_messaging_crypto_and_profile_fields.sql
 *                              (idempotent, safe to repeat), then diagnoses
 *
 * Reads CORE_DATABASE_URL and MESSAGE_ENCRYPTION_KEY from the environment or from .env.local.
 * Run it with the SAME values your production server uses.
 */
import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { getCoreDb } from '../src/lib/db/core';
import { getMessageEncryptionKey } from '../src/lib/crypto';

type Row = Record<string, unknown>;

const MIGRATION_FILE = '0008_messaging_crypto_and_profile_fields.sql';
const REQUIRED_PROFILE_COLUMNS = [
  'student_code',
  'goal',
  'secondary_roles',
  'skill_levels',
  'custom_repos',
  'availability',
  'graduation_year',
];
const REQUIRED_TABLES = ['profiles', 'colleges', 'conversations', 'direct_messages', 'social_accounts'];

let failures = 0;
let warnings = 0;

const pass = (message: string) => console.log(`  ✅ ${message}`);
const warn = (message: string, hint?: string) => {
  warnings += 1;
  console.log(`  ⚠️  ${message}`);
  if (hint) console.log(`     → ${hint}`);
};
const fail = (message: string, hint?: string) => {
  failures += 1;
  console.log(`  ❌ ${message}`);
  if (hint) console.log(`     → ${hint}`);
};

function loadEnvFile(fileName: string): void {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const rows = (result as { rows?: unknown })?.rows;
  return Array.isArray(rows) ? (rows as Row[]) : [];
}

function errorText(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause;
    return cause instanceof Error ? `${error.message} (${cause.message})` : error.message;
  }
  return String(error);
}

async function applyFix(): Promise<void> {
  console.log(`\n[fix] Applying drizzle/${MIGRATION_FILE}`);
  const filePath = path.join(process.cwd(), 'drizzle', MIGRATION_FILE);
  if (!fs.existsSync(filePath)) {
    fail(`Migration file not found: ${filePath}`);
    return;
  }
  const statements = fs
    .readFileSync(filePath, 'utf8')
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean);

  const db = getCoreDb();
  for (let i = 0; i < statements.length; i++) {
    try {
      await db.execute(sql.raw(statements[i]));
      console.log(`  [${i + 1}/${statements.length}] ok`);
    } catch (error: unknown) {
      fail(`Statement ${i + 1} failed: ${errorText(error)}`, 'Fix this error, then run the command again.');
      return;
    }
  }
  pass('Migration applied');
}

async function main(): Promise<void> {
  loadEnvFile('.env.local');
  loadEnvFile('.env');

  if (!process.env.CORE_DATABASE_URL) {
    console.error('CORE_DATABASE_URL is not set. Put it in .env.local or export it, then run again.');
    process.exit(1);
  }

  const shouldFix = process.argv.includes('--fix');
  if (shouldFix) await applyFix();

  const db = getCoreDb();

  console.log('\n[1/7] Connection');
  let currentUser = '';
  try {
    const info = rowsOf(await db.execute(sql`select current_user as u, current_database() as d`))[0];
    currentUser = String(info?.u ?? '');
    pass(`Connected to database "${String(info?.d)}" as role "${currentUser}"`);
  } catch (error: unknown) {
    fail(`Cannot connect: ${errorText(error)}`, 'Check CORE_DATABASE_URL (Neon connection string, sslmode=require).');
    process.exit(1);
  }

  console.log('\n[2/7] Tables');
  const tableRows = rowsOf(
    await db.execute(
      sql`select table_name from information_schema.tables where table_schema = 'public'`,
    ),
  ).map((row) => String(row.table_name));
  for (const table of REQUIRED_TABLES) {
    if (tableRows.includes(table)) pass(`table ${table}`);
    else fail(`table ${table} is missing`, 'Run: pnpm db:migrate');
  }

  console.log('\n[3/7] Profile columns (needed so edits persist)');
  const columnRows = rowsOf(
    await db.execute(
      sql`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'profiles'`,
    ),
  ).map((row) => String(row.column_name));
  const missingColumns = REQUIRED_PROFILE_COLUMNS.filter((column) => !columnRows.includes(column));
  if (missingColumns.length === 0) pass('All profile columns exist');
  else fail(`profiles is missing columns: ${missingColumns.join(', ')}`, 'Run: pnpm db:doctor --fix');

  console.log('\n[4/7] Message encryption (needed to send/read messages)');
  const fnRows = rowsOf(
    await db.execute(
      sql`select proname from pg_proc where proname in ('safe_encrypt_text', 'safe_decrypt_text')`,
    ),
  ).map((row) => String(row.proname));
  const hasFunctions = fnRows.includes('safe_encrypt_text') && fnRows.includes('safe_decrypt_text');
  if (hasFunctions) pass('safe_encrypt_text / safe_decrypt_text exist');
  else fail('Encryption functions are missing: every message send fails with "function does not exist"', 'Run: pnpm db:doctor --fix');

  let key: string | null = null;
  try {
    key = getMessageEncryptionKey();
    if (!process.env.MESSAGE_ENCRYPTION_KEY) {
      warn('MESSAGE_ENCRYPTION_KEY is not set here; using the development fallback key', 'Set the same value your production server uses before judging step 5.');
    } else {
      pass('MESSAGE_ENCRYPTION_KEY is set');
    }
  } catch (error: unknown) {
    fail(errorText(error), 'Set MESSAGE_ENCRYPTION_KEY in your Render environment (and here) and redeploy.');
  }

  if (hasFunctions && key) {
    try {
      const probe = rowsOf(
        await db.execute(sql`select safe_decrypt_text(safe_encrypt_text('ping', ${key}), ${key}) as v`),
      )[0];
      if (probe?.v === 'ping') pass('Encrypt/decrypt round trip works');
      else fail('Encrypt/decrypt round trip returned the wrong value', 'Confirm the pgcrypto extension is installed: pnpm db:doctor --fix');
    } catch (error: unknown) {
      fail(`Round trip failed: ${errorText(error)}`);
    }
  }

  console.log('\n[5/7] Existing messages readable with the current key');
  if (hasFunctions && key && tableRows.includes('direct_messages')) {
    try {
      const counts = rowsOf(
        await db.execute(sql`
          select count(*)::int as total,
                 count(*) filter (where content <> '' and safe_decrypt_text(content, ${key}) is null)::int as unreadable
          from direct_messages
        `),
      )[0];
      const total = Number(counts?.total ?? 0);
      const unreadable = Number(counts?.unreadable ?? 0);
      if (total === 0) pass('No messages stored yet');
      else if (unreadable === 0) pass(`All ${total} stored messages decrypt correctly`);
      else {
        warn(
          `${unreadable} of ${total} stored messages cannot be decrypted with this key`,
          'They were encrypted with a different MESSAGE_ENCRYPTION_KEY (often the dev fallback). Use the original key or accept those old messages are lost.',
        );
      }
    } catch (error: unknown) {
      fail(`Could not check stored messages: ${errorText(error)}`);
    }
  } else {
    warn('Skipped (needs functions, key and table)');
  }

  console.log('\n[6/7] Row-level security (can block writes silently)');
  try {
    const role = rowsOf(
      await db.execute(sql`select rolsuper, rolbypassrls from pg_roles where rolname = current_user`),
    )[0];
    const bypass = Boolean(role?.rolsuper) || Boolean(role?.rolbypassrls);
    const rlsRows = rowsOf(
      await db.execute(sql`
        select c.relname as name, c.relrowsecurity as rls, c.relforcerowsecurity as forced,
               pg_get_userbyid(c.relowner) as owner
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname in ('profiles', 'conversations', 'direct_messages')
      `),
    );
    let blocked = false;
    for (const row of rlsRows) {
      const enabled = Boolean(row.rls);
      const forced = Boolean(row.forced);
      const isOwner = String(row.owner) === currentUser;
      if (enabled && (forced || (!isOwner && !bypass))) {
        blocked = true;
        fail(
          `RLS is enforced on "${String(row.name)}" for role "${currentUser}" (owner: ${String(row.owner)})`,
          `The policies only allow roles named neondb_owner/postgres. Connect as the table owner, or run: ALTER TABLE ${String(row.name)} DISABLE ROW LEVEL SECURITY;`,
        );
      }
    }
    if (!blocked) pass('RLS does not block the application role');
  } catch (error: unknown) {
    warn(`Could not inspect RLS: ${errorText(error)}`);
  }

  console.log('\n[7/7] Profile write test (rolled back, nothing is changed)');
  try {
    const rollbackMarker = new Error('rollback-test');
    let affected = -1;
    try {
      await db.transaction(async (tx) => {
        const result = rowsOf(
          await tx.execute(
            sql`update profiles set updated_at = now() where id = (select id from profiles limit 1) returning id`,
          ),
        );
        affected = result.length;
        throw rollbackMarker;
      });
    } catch (error: unknown) {
      if (error !== rollbackMarker) throw error;
    }
    if (affected === 0) {
      const anyProfile = rowsOf(await db.execute(sql`select count(*)::int as n from profiles`))[0];
      if (Number(anyProfile?.n ?? 0) === 0) warn('No profiles exist yet, so the write test was skipped');
      else fail('UPDATE on profiles affected 0 rows', 'This is what a blocking RLS policy looks like. See step 6.');
    } else if (affected === 1) {
      pass('UPDATE on profiles works for the application role');
    }
  } catch (error: unknown) {
    fail(`Write test failed: ${errorText(error)}`);
  }

  console.log(`\nDone: ${failures} problem(s), ${warnings} warning(s).`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error: unknown) => {
  console.error('db-doctor crashed:', error);
  process.exit(1);
});
