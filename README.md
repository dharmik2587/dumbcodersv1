# HackMate · Intelligent Hackathon Teammate Matching & Workspace

[![Next.js](https://img.shields.io/badge/Next.js-15.2.8-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.40.0-green?style=flat&logo=drizzle)](https://orm.drizzle.team/)
[![Neon Database](https://img.shields.io/badge/Neon-PostgreSQL-00e599?style=flat&logo=postgresql)](https://neon.tech/)
[![Supabase Auth](https://img.shields.io/badge/Supabase-Auth-3ecf8e?style=flat&logo=supabase)](https://supabase.com/)
[![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=flat&logo=render)](https://render.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **HackMate** is the premier platform connecting ambitious student developers, designers, and AI creators with complementary skills to build winning teams for collegiate hackathons across Devfolio, Unstop, and campus events.

---

## ✨ Key Features

### 1. Intelligent Teammate Matchmaking
- **Skill-Complement Analysis**: Calculates coverage across 5 core clusters (Frontend, Backend, AI/ML, Mobile, UI/UX) to ensure no team forms with duplicate roles or missing critical functions.
- **Commitment Window Overlap**: Matches builders based on free hours per week and event schedule alignment.
- **Intent Alignment**: Filters candidates by specific hackathon track interests and project aspirations.

### 2. Multi-Provider Hackathon Aggregator
- **Automated Sync**: Ingestion pipeline syncing verified listings from **Devfolio**, **Unstop**, and **Hack2Skill**.
- **Deduplication Engine**: Deterministic `canonicalKey` generation merging duplicates across platforms.
- **Cycle Countdowns & Bookmarks**: Real-time registration deadlines, prize pool tracking, and direct registration links.

### 3. Verified Builder Profiles
- **LeetCode Integration**: Verifies total solved problems, acceptance rates, and contest rankings via real-time GraphQL verification.
- **GitHub Sync**: Fetches active repositories, language distribution, and commit frequency.
- **Dynamic Builder Cards**: Public profile shareables (`/b/[id]`) with radar competency charts and availability badges.

### 4. End-to-End Secure Collaboration
- **Encrypted Messaging**: Direct 1:1 chats and team room messaging encrypted at rest using PostgreSQL `pgcrypto` (`safe_encrypt_text` / `safe_decrypt_text`).
- **Real-Time Synchronization**: Instant notifications and live updates powered by Pusher Channels.
- **Team Roster Workspace**: Role assignment, open vacancy announcements, and team gap analytics.

### 5. Production SEO Engine
- **Server-Rendered Metadata**: Dynamic OpenGraph, Twitter cards, and canonical links for every hackathon and builder profile.
- **Automated XML Sitemap**: Dynamically generated `/sitemap.xml` listing static pages, published hackathons, and builder profiles with 1-hour ISR revalidation.
- **Hardened Crawl Rules**: Comprehensive `/robots.txt` allowing public indexation while disallowing private workspace, auth, and API paths.
- **Schema.org Structured Data**:
  - `Organization` & `WebSite` with `SearchAction` search bar integration.
  - `Event` JSON-LD schema for hackathons (attendance mode, dates, organizers, and free offers).
  - `BreadcrumbList` breadcrumbs for rich Google search snippets.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 15 (App Router, React 19, Server Components & Route Handlers) |
| **Authentication** | Supabase Auth (`@supabase/ssr` with Cookie session tokens & Bearer headers) |
| **Database** | Neon Serverless PostgreSQL with Drizzle ORM |
| **Cryptography** | PostgreSQL `pgcrypto` (256-bit symmetric encryption for messages at rest) |
| **State & Cache** | TanStack React Query v5, Zustand, Next.js Server Cache |
| **Realtime** | Pusher Channels (`pusher` & `pusher-js`) |
| **Data Ingestion** | Background ingestion scripts with timing-safe HMAC authentication |
| **Styling & UI** | Custom cyber-terminal design tokens, Lucide Icons, Chart.js, Framer Motion |
| **Deployment** | Render (Web Service + Scheduled Sync Cron) |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** >= 20.0.0
- **pnpm** >= 10.0.0
- A Neon PostgreSQL database instance
- A Supabase project for user authentication
- A 64-character hex encryption key

### Installation

```bash
# Clone the repository
git clone https://github.com/dharmik2587/dumbcodersv1.git
cd dumbcodersv1

# Install dependencies using pnpm
pnpm install

# Copy environment template
cp .env.example .env.local
```

### Environment Variables (`.env.local`)

```env
# Application Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require
CORE_DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Database Encryption Key (REQUIRED: exactly 64-character hex string)
MESSAGE_ENCRYPTION_KEY=1e53b1c429a3b7396b64160630d284cb09c746c9439dee3de634650e1300973a

# Pusher Channels
NEXT_PUBLIC_PUSHER_KEY=your-pusher-key
NEXT_PUBLIC_PUSHER_CLUSTER=ap2
PUSHER_APP_ID=your-app-id
PUSHER_KEY=your-pusher-key
PUSHER_SECRET=your-pusher-secret

# AI Roadmap Generation (Optional)
OPENAI_API_KEY=sk-proj-...
```

### Database Setup & Migrations

```bash
# Push schema or run migrations
pnpm db:migrate

# Seed development data
pnpm db:seed
```

### Running Locally

```bash
# Start development server
pnpm dev

# Typecheck and production build
pnpm typecheck
pnpm build
```

---

## ☁️ Deployment on Render

The repository includes a ready-to-use [`render.yaml`](./render.yaml) configuration:

1. **Web Service**:
   - Build Command: `corepack enable && pnpm install --frozen-lockfile && pnpm build`
   - Start Command: `pnpm start`
   - Health Check: `/api/health`
2. **Cron Job**:
   - Schedule: `0 */6 * * *` (every 6 hours)
   - Command: `npx tsx scripts/sync-all-hackathons.ts`

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE). Built by students, for students.
