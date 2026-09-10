# HackMate — Technical Architecture & Feature Specification

> Production Reference (v3). Confirmed and active implementation.
> Scope: **Matching**, **Team Workspace**, **Direct Messaging**, **Leaderboard**, **Hackathons**.

---

## 0. Production Architecture

- **Auth**: Supabase Auth (strictly no Clerk). SSR cookie sessions via `@supabase/ssr`, PKCE / email token confirmation, password recovery flows, and OAuth providers (GitHub, Google).
- **Database**: Single consolidated Neon PostgreSQL database (`@neondatabase/serverless`) managed via Drizzle ORM.
- **Security**:
  - Row Level Security (RLS) active across all 19 relational tables (`drizzle/0005_rls_and_crypto.sql`).
  - Column-level symmetric encryption at rest using PostgreSQL `pgcrypto` (`safe_encrypt_text` / `safe_decrypt_text`) for team chat and direct messages.
  - Rate limiting via Upstash Redis sliding window with memory fallback on all mutations.
  - Zero `any` types across the entire TypeScript codebase.
- **Client State**: TanStack React Query with optimistic UI rollbacks and Zustand for global state.
- **Real-time**: Pusher Channels for chat, messages, and presence indicators.

---

## 1. Matching Engine

**Goal**: Rank partners by verified signals and complementary team skill gaps.

- **Compatibility Algorithm** (`src/lib/compatibility.ts`):
  - Self-declared skills & clusters (35%)
  - Shared & complementary GitHub languages (25%)
  - Team gap relevance (20%) — rewards candidates fulfilling missing team roles
  - Time availability and domain interests (20%)
- **Partner Search API** (`/api/users/search`):
  - Supports filtering by role, college, availability, and active team ID context.
  - Returns match scores, gap-filling badges, and reason statements.

---

## 2. Team Workspace & Roster Management

- **Canonical Roster Gaps** (`src/lib/teams/roster.ts`):
  - Evaluates roster members against canonical roles (`frontend`, `backend`, `ml`, `design`, `pitch`).
  - Displays coverage percentage and actionable CTAs ("Suggested: invite a [role] builder").
- **Team Workspace** (`/teams/[id]`):
  - Roster view with members and open slots.
  - Coverage matrix vs hackathon track demand.
  - Encrypted real-time team chat (`TeamChat.tsx`) with Pusher.

---

## 3. Direct Messaging (1:1 DMs)

- **Storage & Security**:
  - `conversations`: Normalized unique pair index (`userAId < userBId`) preventing duplicate threads.
  - `direct_messages`: `content` encrypted with `pgcrypto` at rest.
- **APIs**:
  - `GET /api/messages`: Lists active conversations with partner profile, last message snippet, and unread counts.
  - `POST /api/messages`: Starts or opens an existing conversation.
  - `GET /api/messages/[conversationId]`: Fetches decrypted message thread and marks incoming messages as read.
  - `POST /api/messages/[conversationId]`: Sends an encrypted message and triggers real-time notification to recipient via Pusher.
- **UI** (`/messages`):
  - Responsive two-column view with search, unread badge, and auto-scroll message viewport.

---

## 4. Leaderboard & Coding Platforms

- **Verification Engine** (`/api/leetcode/*`):
  - Challenge-response verification token (`HM-XXXXXX`) placed in public LeetCode profile bio.
  - Rate-limited status checks and profile syncing.
- **Composite Scoring**:
  - Combines GitHub commits/repos, LeetCode solved count & contest rating, and hackathon awards into normalized 0-100 composite rankings.
  - Filterable by Global, College, and Batch scopes.

---

## 5. Ingestion Pipeline

- **Unified Ingestion Route** (`/api/internal/ingest/hackathons`):
  - Timing-safe HMAC / Bearer authentication.
  - Idempotent deduplication against existing hackathons.
  - Consolidated from redundant legacy cron endpoints.
