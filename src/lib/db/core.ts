import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema/core';

let cachedPool: Pool | undefined;
let cachedDb: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function hasCoreDatabase() {
  return Boolean(process.env.CORE_DATABASE_URL);
}

export function getCoreDb() {
  if (!process.env.CORE_DATABASE_URL) {
    throw new Error('CORE_DATABASE_URL is not configured');
  }

  if (!cachedDb) {
    cachedPool = new Pool({ connectionString: process.env.CORE_DATABASE_URL });
    cachedDb = drizzle(cachedPool, {
      schema,
      logger: process.env.NODE_ENV === 'development',
    });
  }

  return cachedDb;
}

export { schema };
