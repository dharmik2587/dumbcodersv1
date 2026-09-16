-- Fix safe_encrypt_text to be VOLATILE because pgp_sym_encrypt uses random IVs
CREATE OR REPLACE FUNCTION safe_encrypt_text(plaintext text, key text) RETURNS text AS $$
BEGIN
  IF plaintext IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN encode(pgp_sym_encrypt(plaintext, key), 'base64');
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Fix safe_decrypt_text to return NULL instead of silent ciphertext on error
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
$$ LANGUAGE plpgsql IMMUTABLE;
