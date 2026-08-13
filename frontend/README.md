# DevMetrics — Frontend (Phase 2)

React dashboard for DevMetrics — landing page, GitHub OAuth login, and a full
analytics dashboard (overview, contribution heatmap, language breakdown,
commit patterns, PR analytics, repos) backed by the Phase 1 API.

**Stack:** React + Vite · TanStack Router (file-based) · TanStack Query ·
Tailwind CSS v4 · Framer Motion · Lenis · Recharts · `@react-pdf/renderer` ·
Lucide React.

---

## Quick start

```bash
npm install
cp .env.example .env      # VITE_API_URL — defaults to http://localhost:3000
npm run dev                # http://localhost:5173
```

The backend (Phase 1, in the parent directory) must be running — CORS is
locked to `http://localhost:5173` in dev, so keep that port.

## Local testing without a full OAuth login

The backend exposes a **dev-only** route, `GET /auth/dev-login`, gated to
`NODE_ENV=development`. It mints a session for the first user in the
database — useful for testing the dashboard against already-synced data
without repeating the GitHub OAuth flow. Visit
`http://localhost:3000/auth/dev-login` once, then `http://localhost:5173/dashboard`.
Never registered outside development.

## Project layout

```
src/
  api/
    client.ts          Typed fetch client for the backend (credentials: 'include')
    types.ts            Response shapes matching the backend's services/metrics.ts
  components/
    ui/                 Hand-built shadcn-style primitives (Button, Card, Skeleton, ...)
    landing/             FeatureCard
    dashboard/           Sidebar, TopBar, BottomTabBar, Heatmap, LanguagesDonut,
                          HourGrid, CircularProgress, RepoCard, ErrorCard, ...
  hooks/
    use-dashboard-data.ts  TanStack Query hooks (staleTime table, sync-status polling)
  lib/
    query-client.ts      QueryClient + query key registry
    lenis-provider.tsx   Smooth-scroll provider, stopped on the dashboard route
    color-scale.ts        Shared heatmap/hour-grid intensity color function
    language-colors.ts    Palette for language charts
    format.ts             Hour/date formatting helpers
    utils.ts               cn() class merger
  pdf/
    ReportDocument.tsx    @react-pdf/renderer document (header, AI summary,
                            stats, languages, PR metrics, top 5 repos)
    use-export-report.tsx  Gathers fresh data, renders + downloads the PDF
  routes/                 TanStack Router file-based routes
    index.tsx              Landing page (/)
    dashboard/
      route.tsx             Protected layout (redirects to / if unauthenticated)
      index.tsx              Overview
      heatmap.tsx             Full 12-month heatmap
      languages.tsx           Donut + click-to-filter repo list
      commit-patterns.tsx     Day-of-week bar chart + hour grid
      prs.tsx                 Metric cards + merge-rate ring + monthly bar chart
      repos.tsx               Filterable/sortable repo grid
```

## Notes

- **Design tokens** live in `src/index.css` as Tailwind v4 `@theme` variables
  (`bg-background`, `bg-surface`, `border-border`, `text-muted`, etc.) — no
  hardcoded hex values in components.
- **Every section** fetches independently via its own TanStack Query hook; one
  endpoint failing shows an inline error card with retry, the rest of the
  dashboard keeps working.
- **Skeletons** use `isLoading` (not `isFetching`), so they only appear on
  first load, never on background refetches.
- `lucide-react` no longer ships brand/logo icons (e.g. `Github`) — `GitFork`
  is used as the GitHub-adjacent icon throughout.
