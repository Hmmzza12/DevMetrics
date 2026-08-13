# DevMetrics — Backend (Phase 1)

GitHub analytics API: connect a GitHub account, sync coding activity in a
background worker thread, and serve commit/heatmap/language/PR metrics plus an
AI-generated year-in-review summary.

**Stack:** Node.js · Fastify · Drizzle ORM · Turso (libSQL) · GitHub GraphQL API v4 ·
`worker_threads` (no Redis) · Anthropic API · TypeScript (run via `tsx`).

> This is Phase 1 (backend only — **no UI**). Phases 2 (frontend) and 3
> (deployment) build on top of these endpoints.

---

## Quick start

```bash
npm install
cp .env.example .env      # then fill in the values below
npm run db:generate       # generate SQL migrations from the schema (already committed)
npm run db:migrate        # apply migrations to the DB in TURSO_DATABASE_URL
npm run dev               # start on http://localhost:3000 (watch mode)
```

`npm start` runs without watch. `npm run typecheck` runs `tsc --noEmit`.

### Required environment

| Variable | Notes |
|---|---|
| `TURSO_DATABASE_URL` | `file:local.db` for local dev, or a `libsql://…turso.io` URL |
| `TURSO_AUTH_TOKEN` | Turso cloud token (blank for a local file DB) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | From a GitHub OAuth app (below) |
| `GITHUB_CALLBACK_URL` | `http://localhost:3000/auth/github/callback` in dev |
| `ANTHROPIC_API_KEY` | Enables `POST /api/report/summary` (returns 503 if unset) |
| `SESSION_SECRET` | ≥32 chars; encrypts the session cookie. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `TOKEN_ENCRYPTION_KEY` | 64 hex chars; AES-256-GCM key for tokens at rest. Falls back to `SESSION_SECRET` if unset |

### GitHub OAuth app

Create one at <https://github.com/settings/developers> → **New OAuth App**:

- **Authorization callback URL:** `http://localhost:3000/auth/github/callback`
- Scopes requested at runtime: `read:user`, `repo` (needed for private-repo stats)

Copy the client id/secret into `.env`.

---

## How it works

- **Auth** — `@fastify/oauth2` runs the GitHub OAuth flow. The access token is
  **encrypted (AES-256-GCM) at rest** and never returned to the client. The
  session is an encrypted, httpOnly cookie holding only the user id.
- **Sync** — triggering a sync inserts a `sync_jobs` row and spawns a
  `worker_threads` worker (the `sync_jobs` table *is* the queue — no Redis).
  The worker pulls repos → commits → PRs from the **GitHub GraphQL API**,
  computes aggregates, writes them to Turso, and updates `progress`
  (25 → 50 → 75 → 100). Only **one active job per user**; login auto-triggers a
  sync when data is older than 6 hours.
- **Rate limits** — every GraphQL response includes `rateLimit`. If
  `remaining < 100` the sync aborts gracefully and the job is marked `failed`
  with `rate_limit_low` and the reset time (exposed via `/api/sync/status`). It
  never crashes on rate limiting.
- **AI summary** — `/api/report/summary` pulls the user's aggregates, calls the
  Anthropic API (`claude-sonnet-4-6`) for a 3–4 sentence summary, and caches it
  until the next sync.

---

## API

All `/api/*` routes require an authenticated session cookie.

| Method | Path | Returns |
|---|---|---|
| GET | `/auth/github` | Redirects to GitHub OAuth |
| GET | `/auth/github/callback` | Handles callback, sets session, redirects to the frontend |
| POST | `/auth/logout` | Clears the session |
| GET | `/auth/me` | `{ id, username, avatar_url }` or 401 |
| GET | `/api/overview` | total commits, repos, stars, followers, current & longest streak |
| GET | `/api/heatmap` | `{ days: [{ date, count }] }` for the last 12 months (365 days) |
| GET | `/api/languages` | language breakdown `{ language, bytes, percentage }` (optional `?language=` adds repos using it) |
| GET | `/api/commit-patterns` | commits by day-of-week, by hour, and a 7×24 grid |
| GET | `/api/prs` | avg open-to-merge & first-review hours, merge rate %, monthly counts |
| GET | `/api/repos` | repo list with stars, language, last updated, commit count |
| GET | `/api/sync/status` | job status, progress %, last synced, rate-limit reset |
| POST | `/api/sync/trigger` | creates a sync job → `{ job_id, status }` |
| POST | `/api/report/summary` | AI summary `{ summary, cached, generated_at }` |
| GET | `/health` | `{ status: "ok" }` |

### Testing with curl

OAuth needs a browser (GitHub login), so use a cookie jar:

```bash
# 1. Open this in a browser to log in; you'll be redirected to FRONTEND_URL.
open http://localhost:3000/auth/github

# For scripted testing, capture the session cookie from the browser and reuse it:
curl -b "devmetrics_session=<cookie>" http://localhost:3000/auth/me
curl -b "devmetrics_session=<cookie>" -X POST http://localhost:3000/api/sync/trigger
curl -b "devmetrics_session=<cookie>" http://localhost:3000/api/sync/status
curl -b "devmetrics_session=<cookie>" http://localhost:3000/api/overview
```

Unauthenticated requests to `/api/*` and `/auth/me` return `401`.

---

## Project layout

```
src/
  config/env.ts        Validated environment config (zod)
  db/
    schema.ts          Drizzle schema (6 tables)
    client.ts          libSQL + Drizzle instance
    migrate.ts         Migration runner
  lib/
    crypto.ts          AES-256-GCM token encryption
    session.ts         Session helpers + requireAuth
    dates.ts           Calendar-day utilities
  github/
    queries.ts         GraphQL documents (with rateLimit)
    client.ts          GraphQL client + paginated fetchers
  sync/
    queue.ts           sync_jobs queue + status transitions
    runner.ts          The sync pipeline (repos → commits → PRs)
    worker.ts          worker_threads entrypoint
    manager.ts         Spawns workers, auto-sync-on-stale
  services/
    users.ts           Upsert user from OAuth token
    metrics.ts         Aggregations backing the read endpoints
    anthropic.ts       AI summary generation
    report.ts          Summary orchestration + caching
  routes/
    auth.ts            /auth/*
    api.ts             /api/*
  server.ts            Fastify wiring (CORS, cookies, session, OAuth)
```
