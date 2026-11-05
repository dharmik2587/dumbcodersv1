import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export const DEFAULT_MESSAGE_ENCRYPTION_KEY =
  'a3f8902c5e632b437ea2e1d0002bfd6b814d580f2bbb4040a151e48395fce5a7';

/**
 * Returns the server-only message encryption key.
 * Never exposed to the browser.
 */
export function getMessageEncryptionKey(): string {
  const key = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[crypto] MESSAGE_ENCRYPTION_KEY is not set in production environment. ' +
        'Using default project encryption key to prevent messaging downtime.'
      );
    }
    return DEFAULT_MESSAGE_ENCRYPTION_KEY;
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
