# DevMetrics — Complete Build Prompt

> A GitHub analytics dashboard. Run each phase separately in Claude Code.
> Do not skip ahead — each phase has a Definition of Done that must pass before moving on.

---

## PROJECT OVERVIEW

**DevMetrics** is a GitHub analytics dashboard. A user connects their GitHub account and gets a visual breakdown of their coding activity — commit patterns, contribution heatmap, language breakdown, and pull request turnaround metrics. Think "Spotify Wrapped for your GitHub," but with real engineering depth behind it.

**Core value:** It's a data tool, not a toy. The metrics that matter (PR merge time, review turnaround, commit cadence) are the ones engineering teams actually track.

### Full Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| API Framework | Fastify |
| ORM | Drizzle ORM |
| Database | Turso (libSQL) |
| Auth | GitHub OAuth (`@fastify/oauth2`) |
| External API | GitHub GraphQL API v4 |
| Background jobs | Node `worker_threads` + Turso-backed job queue (no Redis) |
| AI summary | Anthropic API (`claude-sonnet-4-6`) |
| PDF generation | `@react-pdf/renderer` |
| Frontend | React + Vite |
| Routing | TanStack Router (file-based) |
| Data fetching | TanStack Query |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Animation | Framer Motion |
| Smooth scroll | Lenis |
| Icons | Lucide React |
| Backend hosting | Railway |
| Frontend hosting | Netlify |
| DB hosting | Turso |

---

# PHASE 1 — BACKEND API

Build the backend for DevMetrics. **No frontend in this phase.**

## Stack

Node.js + Fastify + Drizzle ORM + Turso (libSQL)

## Authentication

GitHub OAuth via `@fastify/oauth2`:

- Store the access token securely per user (encrypted at rest, never returned to the client)
- Request scopes: `read:user`, `repo` (needed for private repo stats)
- Session handling via httpOnly cookie
- `GET /auth/github` → initiates OAuth redirect
- `GET /auth/github/callback` → handles callback, creates/updates user, sets session
- `POST /auth/logout` → clears session
- `GET /auth/me` → returns current user (id, username, avatar_url) or 401

## GitHub Data Fetching

Use the **GitHub GraphQL API v4**, not REST — fewer round trips for nested repo/commit/PR data.

Data to pull:

- User profile: username, avatar, followers, total repo count
- Repositories: name, description, primary language, stars, private flag, updated date
- Language breakdown per repo (bytes per language)
- Commit history: last 12 months, aggregated by day
- Pull requests: opened date, merged date, first review date, merged status

## Database Schema (Drizzle)

```
users
  id (pk)
  github_id (unique)
  username
  avatar_url
  access_token (encrypted)
  followers
  last_synced_at

repos
  id (pk)
  github_id (unique)
  owner_id (fk → users.id)
  name
  description
  primary_language
  stars
  is_private
  commit_count
  updated_at

repo_languages
  id (pk)
  repo_id (fk → repos.id)
  language
  bytes
  percentage

commit_activity
  id (pk)
  owner_id (fk → users.id)
  date (YYYY-MM-DD)
  count
  hour_distribution (JSON: {0: 3, 1: 0, ... 23: 5})

pull_requests
  id (pk)
  github_id (unique)
  repo_id (fk → repos.id)
  owner_id (fk → users.id)
  opened_at
  merged_at
  first_review_at
  was_merged (boolean)

sync_jobs
  id (pk)
  user_id (fk → users.id)
  status (pending | processing | done | failed)
  created_at
  completed_at
  error
  progress (0-100)
```

## Background Sync (Turso-backed queue, no Redis)

- On sync trigger: insert a row into `sync_jobs` with status `pending`
- A worker picks it up via `worker_threads`, sets status to `processing`
- Worker fetches from GitHub, computes aggregates, writes to Turso
- Update `progress` field as it goes (e.g. 25% after repos, 50% after commits, 75% after PRs, 100% done)
- On completion: status `done`, set `completed_at`, update `users.last_synced_at`
- On failure: status `failed`, write the error message
- Auto-trigger a sync on login if `last_synced_at` is older than 6 hours
- Only one active job per user at a time — if a job is already pending/processing, return that job instead of creating a new one

## Rate Limit Handling

- Query GitHub's `rateLimit` field in the GraphQL response before each batch
- If `remaining < 100`, abort the sync gracefully, mark the job `failed` with error `rate_limit_low`
- Store the rate limit reset timestamp and expose it via the sync status endpoint
- Never crash on rate limit — always degrade gracefully

## API Endpoints

| Method | Path | Returns |
|---|---|---|
| GET | `/api/overview` | total commits, repo count, total stars, followers, current streak, longest streak |
| GET | `/api/heatmap` | daily commit counts for last 12 months (array of `{date, count}`) |
| GET | `/api/languages` | language breakdown across all repos (`{language, bytes, percentage}`) |
| GET | `/api/commit-patterns` | commits grouped by day-of-week AND by hour-of-day |
| GET | `/api/prs` | avg open-to-merge time, avg first-review time, merge rate %, monthly PR counts |
| GET | `/api/repos` | repo list with stars, language, last updated, commit count |
| GET | `/api/sync/status` | current job status, progress %, last_synced_at, rate limit reset time |
| POST | `/api/sync/trigger` | creates a new sync job, returns job id |
| POST | `/api/report/summary` | AI-generated summary paragraph (see below) |

### `POST /api/report/summary` details

- Pull the user's aggregated stats from Turso
- Call the Anthropic API with model `claude-sonnet-4-6`
- Prompt it to write a **3–4 sentence** natural-language summary of the user's coding year
- The summary should mention: total commit volume, busiest period, primary language, and one notable PR/collaboration insight
- Tone: factual and complimentary, not hyperbolic
- Cache the result — don't regenerate on every request; only regenerate after a new sync

## Phase 1 Definition of Done

- [ ] GitHub OAuth login works end-to-end with a real account
- [ ] Sync job triggers, processes in a worker thread, and writes aggregated data to Turso
- [ ] All 9 endpoints return correct, well-shaped JSON
- [ ] Progress field updates during sync and is readable via `/api/sync/status`
- [ ] Rate limit guard verified — won't crash when quota is low
- [ ] `/api/report/summary` returns a real AI-generated paragraph
- [ ] Everything testable via curl or Postman
- [ ] **No UI whatsoever**

---

# PHASE 2 — FRONTEND

Build the DevMetrics frontend. The Phase 1 API is complete and running.

## Stack

React + Vite, TanStack Router, TanStack Query, Tailwind + shadcn/ui, Recharts, Framer Motion, Lenis, Lucide React

## Design System

**Dark theme only — no light mode.**

```
Background:       #0a0a0f
Surface / cards:  #111118
Border:           #1e1e2e
Primary accent:   #6366f1  (indigo)
Secondary accent: #a855f7  (purple)
Text primary:     #e2e8f0
Text muted:       #64748b
Success / positive: #22c55e
```

- **Typography:** Inter for body, Sora for headings (import both from Google Fonts)
- **Cards:** subtle 1px border, very slight background blur, no heavy shadows — clean and minimal
- **Spacing:** generous padding, breathable layout, nothing cramped
- Set all of the above as CSS custom properties / Tailwind theme tokens, not hardcoded hex values scattered through components

## Page 1 — Landing ( `/` )

- **Hero:** animated gradient background using pure CSS `@keyframes` (a slow-moving radial gradient — no library needed)
- **Headline:** "Your GitHub story, visualized" — Sora, large
- **Subheadline:** short one-liner describing the product
- **CTA:** "Connect with GitHub" button → redirects to backend OAuth endpoint
- **Feature cards:** 3 cards below the hero (Commit Patterns, PR Analytics, Language Breakdown) with Lucide icons, fading in on scroll via Framer Motion `whileInView`
- **Footer:** minimal — name + GitHub link

## Page 2 — Dashboard ( `/dashboard` )

- **Protected route** — redirect to `/` if `/auth/me` returns 401
- **Layout:** sidebar navigation on desktop, bottom tab bar on mobile
- **Sidebar items:** Overview, Heatmap, Languages, Commit Patterns, PRs, Repos
- **Top bar:** user avatar + username, sync status indicator, manual refresh button, Export Report button

### Sync status indicator behavior

- While `pending` or `processing`: show "Syncing… {progress}%" with a rotating icon
- When `done`: show "Last synced {X} minutes ago"
- When `failed`: show error state with a retry button
- Poll `/api/sync/status` every 3s while syncing, stop polling when done

## Dashboard Sections

### Overview

- 4 stat cards: Total Commits, Repos, Stars, Current Streak
- Each number animates from 0 to its value on mount (Framer Motion `useMotionValue` + `animate`)
- Cards stagger in with 0.1s delay between each (`staggerChildren`)
- Below the stats: mini 3-month heatmap preview and a small top-languages donut chart, side by side

### Heatmap

- Full 12-month contribution heatmap — custom component, **not** a chart library
- Structure: 53 columns × 7 rows of small rounded squares
- Color intensity scales with commit count: `#1e1e2e` (zero) → `#6366f1` (high)
- Hover: square scales up slightly, spring-animated tooltip shows date + commit count
- Month labels above the columns, day labels (Mon / Wed / Fri) down the left
- **No entrance animation on the squares** — too many elements, it'll look chaotic

### Languages

- Recharts donut chart showing language breakdown by percentage
- Custom legend beside it: colored dot, language name, percentage
- Legend items fade in with stagger on mount
- Clicking a language highlights its slice and lists the repos using it below

### Commit Patterns

Two visualizations side by side:

1. **Bar chart (Recharts):** commits by day of week, Mon–Sun
2. **Hour grid (custom SVG, NOT Recharts):** 24 columns (hours) × 7 rows (days), color intensity = commit frequency. Build this raw as an SVG grid — do not try to force a chart library into this shape.

Both animate in on scroll via `whileInView` with `viewport: { once: true }`.

### PR Analytics

- 3 metric cards: Avg open-to-merge time, Avg first-review time, Merge rate %
- Merge rate rendered as an **animated circular progress ring** — custom SVG, animate `stroke-dashoffset` with Framer Motion
- Below: Recharts bar chart of PRs opened per month (last 12 months)

### Repos

- Filterable, sortable grid of repo cards
- Filter by language (dropdown), sort by stars / commits / last updated
- Each card: name, description, language badge, star count, last updated
- Hover: subtle border glow via `box-shadow` in the accent color

## Animation Spec (Framer Motion)

| Element | Animation |
|---|---|
| Page transitions | fade + slight upward slide (`y: 20 → 0`, `opacity: 0 → 1`) |
| Stat cards | staggered entrance + number count-up on mount |
| Charts | `whileInView` reveal, opacity + y transform, `viewport: { once: true }` |
| Heatmap squares | hover scale + spring tooltip only — no entrance animation |
| Sync button icon | continuous rotation while syncing |
| Sidebar nav | subtle background slide on active state |

**Restraint matters here.** This is a data tool — animation should make it feel alive on load, not fight with legibility. Keep chart tooltips and axis interactions snappy and default.

## Lenis Smooth Scroll

- Wrap the app in a Lenis provider, initialized in `main.tsx`
- Connect Lenis to Framer Motion's `useScroll` for scroll-linked animations
- Disable Lenis on the dashboard if it interferes with any scrollable inner containers

## TanStack Query Configuration

| Endpoint | queryKey | staleTime | Notes |
|---|---|---|---|
| `/api/overview` | `['overview']` | 5 min | |
| `/api/heatmap` | `['heatmap']` | 10 min | |
| `/api/languages` | `['languages']` | 10 min | |
| `/api/commit-patterns` | `['commit-patterns']` | 10 min | |
| `/api/prs` | `['prs']` | 5 min | |
| `/api/repos` | `['repos']` | 5 min | |
| `/api/sync/status` | `['sync-status']` | 0 | `refetchInterval: 3000` while syncing, stop when done |

- On sync completion, invalidate all other query keys so the dashboard refreshes with new data

## Loading & Error States

**Loading:**
- Every section gets a **skeleton loader**, not a spinner
- Use the shadcn/ui `Skeleton` component, shaped to match the real content
- Show skeletons on first load only — not on background refetches

**Errors:**
- If an endpoint fails, show an inline error card with a retry button in that section
- **Never crash the whole dashboard because one section failed**

## PDF Export

- "Export Report" button in the top bar
- On click: generate a styled PDF via `@react-pdf/renderer`

**PDF contents:**

1. Header — user avatar, username, "DevMetrics Annual Report {year}"
2. AI summary paragraph (from `POST /api/report/summary`)
3. Overview stats table
4. Language breakdown list
5. PR metrics
6. Top 5 repos by commit count

Style it cleanly. If `@react-pdf/renderer` handles dark backgrounds well, use the app's dark theme; otherwise use white with indigo accents.

## Phase 2 Definition of Done

- [ ] Landing page renders with animated hero; OAuth button works
- [ ] Dashboard loads real data from the backend for all 6 sections
- [ ] All animations work: count-up stats, staggered cards, scroll reveals, heatmap hover
- [ ] Sync status polls correctly and shows live progress
- [ ] Skeleton loaders appear on first fetch
- [ ] One failing endpoint does not break the rest of the dashboard
- [ ] PDF export produces a real downloadable file containing the AI summary
- [ ] Fully responsive: sidebar on desktop, bottom tabs on mobile
- [ ] **Zero placeholder or mock data** — everything comes from the API

---

# PHASE 3 — DEPLOYMENT

Deploy DevMetrics to production.

## Database — Turso

- Create a production database (separate from local dev)
- Run Drizzle migrations against production
- Save the production `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`

## Backend — Railway

- Deploy the Fastify API to Railway
- Environment variables to set:
  - `TURSO_DATABASE_URL`
  - `TURSO_AUTH_TOKEN`
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - `GITHUB_CALLBACK_URL` (production URL)
  - `ANTHROPIC_API_KEY`
  - `SESSION_SECRET`
  - `FRONTEND_URL` (for CORS + OAuth redirect)
- Configure CORS to allow only the Netlify frontend origin, with credentials enabled
- Verify `worker_threads` run correctly in Railway's environment

## Frontend — Netlify

- Deploy the Vite build to Netlify
- Environment variable: `VITE_API_URL` → the Railway backend URL
- Add a `_redirects` file (or `netlify.toml`) with an SPA fallback so TanStack Router client-side routes don't 404 on refresh:
  ```
  /*  /index.html  200
  ```

## GitHub OAuth App

- Create a **production** OAuth app in GitHub settings (separate from the dev one)
- Set the Authorization callback URL to the Railway backend callback route
- Keep the dev OAuth app pointing at localhost

## Post-Deploy Checklist

- [ ] OAuth login works on the live site
- [ ] Cookies are set correctly across the Netlify → Railway origin boundary (`SameSite=None; Secure`)
- [ ] Sync runs successfully in production
- [ ] All dashboard sections load real data
- [ ] PDF export works in production
- [ ] Rate limit handling verified against the real GitHub API
- [ ] No secrets committed to the repo — verify `.env` is gitignored

## Phase 3 Definition of Done

- [ ] Live URL works end-to-end for a fresh user who has never logged in before
- [ ] Full flow verified: land → OAuth → sync → dashboard → export PDF
- [ ] README written with screenshots, stack list, and a live demo link

---

## Build Notes

**Order matters.** Don't start Phase 2 until every Phase 1 endpoint returns correct JSON — debugging a broken chart is much harder when you don't know if the data or the component is at fault.

**Two things to watch:**

1. The **hour-of-day grid** in Commit Patterns is a custom SVG component. If Claude Code reaches for Recharts here, push back — a chart library will fight you on this shape.
2. The **`/api/report/summary`** endpoint belongs to Phase 1 but is only consumed in Phase 2. Make sure it's built and tested in Phase 1 so the PDF export isn't blocked later.

**Scope discipline.** Ship Phases 1–3 with everything above before adding anything new. The PR turnaround metrics and the exportable report are the two features that make this stand out to a hiring manager — don't cut them to add something flashier.
