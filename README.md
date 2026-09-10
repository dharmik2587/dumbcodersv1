# HackMate

HackMate is the premier hackathon teammate matching and collaboration workspace platform, designed for college and developer hackathon teams.

## Production Architecture

- **Web Framework**: Next.js 15 (App Router, Server Components & Route Handlers)
- **Authentication**: Supabase Auth (SSR Cookie Session Management, JWT verification, Email Confirmation & Password Recovery, OAuth with GitHub/Google). Strictly no Clerk.
- **Database**: Single Neon PostgreSQL database (`@neondatabase/serverless`) managed with Drizzle ORM.
- **Security & Cryptography**:
  - Row Level Security (RLS) enabled on all tables.
  - Chat & direct messages encrypted at rest using PostgreSQL `pgcrypto` (`safe_encrypt_text` / `safe_decrypt_text`).
  - Strict input validation via Zod on all route handlers.
  - Zero literal secrets in codebase; timing-safe HMAC authentication for ingestion pipelines.
- **Rate Limiting**: Unified Upstash Redis sliding-window limiter with graceful in-memory fallback.
- **State & Real-time**:
  - TanStack React Query (client cache, optimistic UI updates with rollback).
  - Zustand (global builder & session store).
  - Pusher Channels (real-time chat, direct messaging, and presence indicators).
- **Styling**: Tailwind CSS with custom cyber-terminal design tokens, Google Fonts typography, Framer Motion page transitions, and accessible UI primitives.

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+ or 10+
- Neon PostgreSQL connection string (`DATABASE_URL` / `CORE_DATABASE_URL`)
- Supabase project (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)

### Environment Configuration

Create `.env.local` based on `.env.example`:

```bash
cp .env.example .env.local
```

Essential variables:
```env
# Database
DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require
CORE_DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Encryption Key (for chat & messages at rest)
MESSAGE_ENCRYPTION_KEY=your-secure-32-byte-hex-or-secret

# Pusher Channels
NEXT_PUBLIC_PUSHER_KEY=your-pusher-key
NEXT_PUBLIC_PUSHER_CLUSTER=ap2
PUSHER_APP_ID=your-app-id
PUSHER_KEY=your-pusher-key
PUSHER_SECRET=your-pusher-secret

# Upstash Redis (Optional for production distributed rate limiting)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### Installation & Development

```bash
pnpm install
pnpm dev
```

The application will be accessible at `http://localhost:3000`.

---

## Database Management

Migrations are defined in `drizzle/` and executed using Drizzle ORM:

```bash
# Generate migrations
pnpm db:generate

# Apply migrations to Neon database
pnpm db:migrate

# Seed development data
pnpm db:seed
```

---

## Key Features

1. **Intelligent Teammate Matching**:
   - Complementary skill-gap matching across taxonomy clusters.
   - Verified GitHub and LeetCode activity integration.
   - Structured collaboration requests with role and event attribution.

2. **Team Workspace**:
   - Live roster management and vacancy slots.
   - Canonical role coverage analysis (`computeTeamGaps`).
   - Encrypted team chat powered by `pgcrypto` and Pusher Channels.

3. **Direct 1:1 Messaging**:
   - Secure encrypted conversations between builders (`/messages`).
   - Real-time message synchronization with read receipts.

4. **Hackathon Aggregator**:
   - Automated ingestion pipeline for verified hackathons (`/api/internal/ingest/hackathons`).
   - Bookmark, interest tracking, and calendar deadline countdowns.

5. **Competitive Leaderboard**:
   - Composite score derived from GitHub repos, commits, LeetCode solved problems, contest ratings, and hackathon results.
   - Global, college-level, and batch filtering.
