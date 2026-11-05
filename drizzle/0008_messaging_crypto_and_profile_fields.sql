-- 0008: make messaging work on a journal-built database and persist every editable profile field.
-- Fully idempotent: safe to run on databases where parts of 0005_rls_and_crypto / 0006_fix_crypto were applied by hand.

CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint

CREATE OR REPLACE FUNCTION safe_encrypt_text(plaintext text, key text) RETURNS text AS $$
BEGIN
  IF plaintext IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN encode(pgp_sym_encrypt(plaintext, key), 'base64');
END;
$$ LANGUAGE plpgsql VOLATILE;--> statement-breakpoint

CREATE OR REPLACE FUNCTION safe_decrypt_text(ciphertext text, key text) RETURNS text AS $$
BEGIN
  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN ciphertext;
  END IF;
  BEGIN
    RETURN pgp_sym_decrypt(decode(ciphertext, 'base64'), key);
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;--> statement-breakpoint

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "goal" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "secondary_roles" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "skill_levels" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "custom_repos" jsonb;
