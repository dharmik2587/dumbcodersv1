-- Enable pgcrypto extension for at-rest message encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Safe message encryption functions using pgcrypto
CREATE OR REPLACE FUNCTION safe_encrypt_text(plaintext text, key text) RETURNS text AS $$
BEGIN
  IF plaintext IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN encode(pgp_sym_encrypt(plaintext, key), 'base64');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION safe_decrypt_text(ciphertext text, key text) RETURNS text AS $$
BEGIN
  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN ciphertext;
  END IF;
  BEGIN
    RETURN pgp_sym_decrypt(decode(ciphertext, 'base64'), key);
  EXCEPTION WHEN OTHERS THEN
    RETURN ciphertext;
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to ensure auth.uid() returns text safely
CREATE OR REPLACE FUNCTION current_auth_uid() RETURNS text AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claim.sub', true),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  );
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 1. colleges
ALTER TABLE "colleges" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "colleges_select" ON "colleges";
CREATE POLICY "colleges_select" ON "colleges" FOR SELECT USING (true);

-- 2. profiles
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON "profiles";
CREATE POLICY "profiles_select" ON "profiles" FOR SELECT USING (true);
DROP POLICY IF EXISTS "profiles_update" ON "profiles";
CREATE POLICY "profiles_update" ON "profiles" FOR UPDATE USING (current_auth_uid() = id OR current_user = 'neondb_owner' OR current_user = 'postgres') WITH CHECK (current_auth_uid() = id OR current_user = 'neondb_owner' OR current_user = 'postgres');
DROP POLICY IF EXISTS "profiles_insert" ON "profiles";
CREATE POLICY "profiles_insert" ON "profiles" FOR INSERT WITH CHECK (current_auth_uid() = id OR current_user = 'neondb_owner' OR current_user = 'postgres');

-- 3. github_data
ALTER TABLE "github_data" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "github_data_select" ON "github_data";
CREATE POLICY "github_data_select" ON "github_data" FOR SELECT USING (true);
DROP POLICY IF EXISTS "github_data_modify" ON "github_data";
CREATE POLICY "github_data_modify" ON "github_data" FOR ALL USING (current_auth_uid() = user_id OR current_user = 'neondb_owner' OR current_user = 'postgres');

-- 4. leetcode_data
ALTER TABLE "leetcode_data" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leetcode_data_select" ON "leetcode_data";
CREATE POLICY "leetcode_data_select" ON "leetcode_data" FOR SELECT USING (true);
DROP POLICY IF EXISTS "leetcode_data_modify" ON "leetcode_data";
CREATE POLICY "leetcode_data_modify" ON "leetcode_data" FOR ALL USING (current_auth_uid() = user_id OR current_user = 'neondb_owner' OR current_user = 'postgres');

-- 5. webhook_events
ALTER TABLE "webhook_events" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "webhook_events_service" ON "webhook_events";
CREATE POLICY "webhook_events_service" ON "webhook_events" FOR ALL USING (current_user = 'neondb_owner' OR current_user = 'postgres');

-- 6. hackathons
ALTER TABLE "hackathons" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hackathons_select" ON "hackathons";
CREATE POLICY "hackathons_select" ON "hackathons" FOR SELECT USING (true);
DROP POLICY IF EXISTS "hackathons_modify" ON "hackathons";
CREATE POLICY "hackathons_modify" ON "hackathons" FOR ALL USING (current_user = 'neondb_owner' OR current_user = 'postgres');

-- 7. hackathon_sources
ALTER TABLE "hackathon_sources" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hackathon_sources_select" ON "hackathon_sources";
CREATE POLICY "hackathon_sources_select" ON "hackathon_sources" FOR SELECT USING (true);
DROP POLICY IF EXISTS "hackathon_sources_modify" ON "hackathon_sources";
CREATE POLICY "hackathon_sources_modify" ON "hackathon_sources" FOR ALL USING (current_user = 'neondb_owner' OR current_user = 'postgres');

-- 8. ingestion_runs
ALTER TABLE "ingestion_runs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ingestion_runs_select" ON "ingestion_runs";
CREATE POLICY "ingestion_runs_select" ON "ingestion_runs" FOR SELECT USING (true);
DROP POLICY IF EXISTS "ingestion_runs_modify" ON "ingestion_runs";
CREATE POLICY "ingestion_runs_modify" ON "ingestion_runs" FOR ALL USING (current_user = 'neondb_owner' OR current_user = 'postgres');

-- 9. hackathon_bookmarks
ALTER TABLE "hackathon_bookmarks" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hackathon_bookmarks_policy" ON "hackathon_bookmarks";
CREATE POLICY "hackathon_bookmarks_policy" ON "hackathon_bookmarks" FOR ALL USING (current_auth_uid() = user_id OR current_user = 'neondb_owner' OR current_user = 'postgres');

-- 10. hackathon_interests
ALTER TABLE "hackathon_interests" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hackathon_interests_policy" ON "hackathon_interests";
CREATE POLICY "hackathon_interests_policy" ON "hackathon_interests" FOR ALL USING (current_auth_uid() = user_id OR current_user = 'neondb_owner' OR current_user = 'postgres');

-- 11. teams
ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teams_select" ON "teams";
CREATE POLICY "teams_select" ON "teams" FOR SELECT USING (
  is_open = true 
  OR leader_id = current_auth_uid() 
  OR current_user = 'neondb_owner' 
  OR current_user = 'postgres'
  OR EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = teams.id AND team_members.user_id = current_auth_uid())
);
DROP POLICY IF EXISTS "teams_modify" ON "teams";
CREATE POLICY "teams_modify" ON "teams" FOR ALL USING (
  leader_id = current_auth_uid() 
  OR current_user = 'neondb_owner' 
  OR current_user = 'postgres'
);

-- 12. team_members
ALTER TABLE "team_members" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_members_select" ON "team_members";
CREATE POLICY "team_members_select" ON "team_members" FOR SELECT USING (true);
DROP POLICY IF EXISTS "team_members_modify" ON "team_members";
CREATE POLICY "team_members_modify" ON "team_members" FOR ALL USING (
  user_id = current_auth_uid() 
  OR current_user = 'neondb_owner' 
  OR current_user = 'postgres'
  OR EXISTS (SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND teams.leader_id = current_auth_uid())
);

-- 13. team_requests
ALTER TABLE "team_requests" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_requests_select" ON "team_requests";
CREATE POLICY "team_requests_select" ON "team_requests" FOR SELECT USING (
  from_user_id = current_auth_uid() 
  OR to_user_id = current_auth_uid() 
  OR current_user = 'neondb_owner' 
  OR current_user = 'postgres'
);
DROP POLICY IF EXISTS "team_requests_modify" ON "team_requests";
CREATE POLICY "team_requests_modify" ON "team_requests" FOR ALL USING (
  from_user_id = current_auth_uid() 
  OR to_user_id = current_auth_uid() 
  OR current_user = 'neondb_owner' 
  OR current_user = 'postgres'
);

-- 14. notifications
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_policy" ON "notifications";
CREATE POLICY "notifications_policy" ON "notifications" FOR ALL USING (
  user_id = current_auth_uid() 
  OR current_user = 'neondb_owner' 
  OR current_user = 'postgres'
);

-- 15. outbox_events
ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "outbox_events_service" ON "outbox_events";
CREATE POLICY "outbox_events_service" ON "outbox_events" FOR ALL USING (current_user = 'neondb_owner' OR current_user = 'postgres');

-- 16. team_messages (Only participants can SELECT)
ALTER TABLE "team_messages" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_messages_select" ON "team_messages";
CREATE POLICY "team_messages_select" ON "team_messages" FOR SELECT USING (
  current_user = 'neondb_owner' 
  OR current_user = 'postgres'
  OR EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = team_messages.team_id AND team_members.user_id = current_auth_uid())
);
DROP POLICY IF EXISTS "team_messages_insert" ON "team_messages";
CREATE POLICY "team_messages_insert" ON "team_messages" FOR INSERT WITH CHECK (
  current_user = 'neondb_owner' 
  OR current_user = 'postgres'
  OR (user_id = current_auth_uid() AND EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = team_messages.team_id AND team_members.user_id = current_auth_uid()))
);

-- 17. conversations
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_select" ON "conversations";
CREATE POLICY "conversations_select" ON "conversations" FOR SELECT USING (
  user_a_id = current_auth_uid() 
  OR user_b_id = current_auth_uid() 
  OR current_user = 'neondb_owner' 
  OR current_user = 'postgres'
);
DROP POLICY IF EXISTS "conversations_modify" ON "conversations";
CREATE POLICY "conversations_modify" ON "conversations" FOR ALL USING (
  user_a_id = current_auth_uid() 
  OR user_b_id = current_auth_uid() 
  OR current_user = 'neondb_owner' 
  OR current_user = 'postgres'
);

-- 18. direct_messages (Only participants can SELECT)
ALTER TABLE "direct_messages" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "direct_messages_select" ON "direct_messages";
CREATE POLICY "direct_messages_select" ON "direct_messages" FOR SELECT USING (
  current_user = 'neondb_owner' 
  OR current_user = 'postgres'
  OR EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = direct_messages.conversation_id 
    AND (c.user_a_id = current_auth_uid() OR c.user_b_id = current_auth_uid())
  )
);
DROP POLICY IF EXISTS "direct_messages_insert" ON "direct_messages";
CREATE POLICY "direct_messages_insert" ON "direct_messages" FOR INSERT WITH CHECK (
  current_user = 'neondb_owner' 
  OR current_user = 'postgres'
  OR (
    sender_id = current_auth_uid() 
    AND EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = direct_messages.conversation_id 
      AND (c.user_a_id = current_auth_uid() OR c.user_b_id = current_auth_uid())
    )
  )
);

-- 19. connected_accounts
ALTER TABLE "connected_accounts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "connected_accounts_policy" ON "connected_accounts";
CREATE POLICY "connected_accounts_policy" ON "connected_accounts" FOR ALL USING (
  user_id = current_auth_uid() 
  OR current_user = 'neondb_owner' 
  OR current_user = 'postgres'
);
