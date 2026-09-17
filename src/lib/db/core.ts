import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema/core';

let cachedPool: Pool | undefined;
let cachedDb: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function hasCoreDatabase() {
  return Boolean(process.env.CORE_DATABASE_URL);
}

export function resetCoreDb() {
  if (cachedPool) {
    cachedPool.end().catch(() => {});
  }
  cachedPool = undefined;
  cachedDb = undefined;
}

export function getCoreDb() {
  if (!process.env.CORE_DATABASE_URL) {
    throw new Error('CORE_DATABASE_URL is not configured');
  }

  if (!cachedDb || !cachedPool) {
    cachedPool = new Pool({
      connectionString: process.env.CORE_DATABASE_URL,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 10,
    });

    cachedPool.on('error', (err: Error) => {
      console.warn('Neon pool client connection error (auto-resetting):', err.message);
      cachedPool = undefined;
      cachedDb = undefined;
    });

    cachedDb = drizzle(cachedPool, {
      schema,
      logger: process.env.NODE_ENV === 'development',
    });
  }

  return cachedDb;
}

export { schema };
