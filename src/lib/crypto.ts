import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

/**
 * Returns the server-only message encryption key.
 * Never exposed to the browser.
 */
export function getMessageEncryptionKey(): string {
  const key = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      '[crypto] MESSAGE_ENCRYPTION_KEY is required but not set. ' +
      'Add it to your .env file. Do NOT reuse SUPABASE_SERVICE_ROLE_KEY — ' +
      'rotate that key immediately if it was previously used here.'
    );
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
