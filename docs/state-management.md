# State Management Strategy

HackMate utilizes a hybrid state management approach. This document outlines the intentional co-existence of our local and server state tools.

## 1. Zustand (`src/client/store/`)
**Purpose**: Local UI state, optimistic updates, and seed data compatibility.

We use Zustand primarily for:
- **Seed Data Mode**: The `useStore` (`store.ts`) manages mock data for the Kanban board and older legacy features that haven't fully migrated to real APIs.
- **Client Session/App State**: The `useApiStore` (`apiStore.ts`) manages the active team context (`activeTeamId`), toast notifications, and client-side auth caching.

*Rule of thumb*: Use Zustand for ephemeral UI state (modals, active tabs) or when you need to share a small piece of global context (like the currently selected team) without triggering a full page reload.

## 2. Server State (Native Fetch & React Server Components)
**Purpose**: Real, persistent database state.

For newer features (e.g., AI Projects Roadmap, Hackathon Discovery), we bypass Zustand for data fetching:
- **App Router Native Fetching**: We use native `fetch` in Client Components (e.g., `projects/[id]/page.tsx`) to pull fresh data directly from our `/api/*` routes.
- **Server Components**: Where possible, data fetching happens on the server before rendering the component.

### Why not fully consolidate?
While we could theoretically move everything to TanStack Query or entirely to Server Components, the dual-path approach allows us to:
1. Preserve the rich drag-and-drop interactions of the mock Kanban board (Zustand) without a full backend rewrite.
2. Build new features rapidly with direct Next.js `fetch` against real API routes.

### Future Consolidation Path
If we eventually rebuild the Kanban board to use real database endpoints (e.g., `POST /api/projects/[id]/tasks`), we will deprecate the mock `useStore` and rely entirely on server-driven data fetching, keeping `useApiStore` only for UI state (toasts, active team context).
