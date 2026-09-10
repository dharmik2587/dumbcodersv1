import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

/**
 * Returns the server-only message encryption key.
 * Never exposed to the browser.
 */
export function getMessageEncryptionKey(): string {
  const key = process.env.MESSAGE_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('Missing MESSAGE_ENCRYPTION_KEY or SUPABASE_SERVICE_ROLE_KEY in environment');
  }
  return key;
}

/**
 * SQL expression to encrypt text content at rest using pgcrypto.
 */
export function sqlEncrypt(content: string): SQL<string> {
  const key = getMessageEncryptionKey();
  return sql`safe_encrypt_text(${content}, ${key})`;
}

/**
 * SQL expression to decrypt ciphertext at rest using pgcrypto.
 */
export function sqlDecrypt(column: unknown): SQL<string> {
  const key = getMessageEncryptionKey();
  return sql`safe_decrypt_text(${column}, ${key})`;
}
