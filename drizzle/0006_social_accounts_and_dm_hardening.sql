-- Migration 0006: social_accounts and DM hardening

-- 1. Create social_accounts table
CREATE TABLE IF NOT EXISTS "social_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  "platform" text NOT NULL CHECK (platform IN ('github','discord','linkedin','telegram','portfolio','x','devto','kaggle','codeforces','stackoverflow')),
  "username" text,
  "display_name" text,
  "profile_url" text,
  "provider_user_id" text,
  "is_verified" boolean NOT NULL DEFAULT false,
  "verified_at" timestamp with time zone,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for social_accounts
CREATE INDEX IF NOT EXISTS social_accounts_user_idx ON social_accounts(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_user_platform_idx ON social_accounts(user_id, platform);
CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_provider_identity_idx ON social_accounts(platform, provider_user_id) WHERE provider_user_id IS NOT NULL;

-- RLS policies for social_accounts
ALTER TABLE "social_accounts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "social_accounts_select" ON "social_accounts";
CREATE POLICY "social_accounts_select" ON "social_accounts" FOR SELECT USING (true);

DROP POLICY IF EXISTS "social_accounts_modify" ON "social_accounts";
CREATE POLICY "social_accounts_modify" ON "social_accounts" FOR ALL USING (
  user_id = current_auth_uid() 
  OR current_user = 'neondb_owner' 
  OR current_user = 'postgres'
);

-- 2. Canonical conversation expression unique index
CREATE UNIQUE INDEX IF NOT EXISTS conversations_canonical_pair_idx 
ON conversations(LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id));
