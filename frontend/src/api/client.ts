import type {
  CommitPatterns,
  CompareResponse,
  CompareStatusResponse,
  Heatmap,
  Languages,
  Me,
  Overview,
  PRMetrics,
  PublicStatusResponse,
  PublicSyncResponse,
  ReportSummary,
  Repos,
  SyncStatusResponse,
  SyncTriggerResponse,
} from './types';

export const API_URL = import.meta.env.VITE_API_URL as string;

export class ApiError extends Error {
  status: number;
  /** Parsed error body, e.g. `{ error: 'rate_limited', reset_at }`. */
  body: Record<string, unknown> | null;
  constructor(status: number, message: string, body: Record<string, unknown> | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Only send a JSON content-type when there's actually a body — Fastify's
  // default JSON parser rejects an empty body sent with that header (e.g.
  // POST /api/sync/trigger, which has no request body).
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    let body: Record<string, unknown> | null = null;
    try {
      body = (await res.json()) as Record<string, unknown>;
      message = (body.message as string) ?? (body.error as string) ?? message;
    } catch {
      // response had no JSON body
    }
    throw new ApiError(res.status, message, body);
  }

  return res.json() as Promise<T>;
}

export const api = {
  me: () => request<Me>('/auth/me'),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),

  overview: () => request<Overview>('/api/overview'),
  heatmap: () => request<Heatmap>('/api/heatmap'),
  languages: (language?: string) =>
    request<Languages>(
      `/api/languages${language ? `?language=${encodeURIComponent(language)}` : ''}`,
    ),
  commitPatterns: () => request<CommitPatterns>('/api/commit-patterns'),
  prs: () => request<PRMetrics>('/api/prs'),
  repos: () => request<Repos>('/api/repos'),

  syncStatus: () => request<SyncStatusResponse>('/api/sync/status'),
  syncTrigger: () =>
    request<SyncTriggerResponse>('/api/sync/trigger', { method: 'POST' }),

  reportSummary: () =>
    request<ReportSummary>('/api/report/summary', { method: 'POST' }),

  // ── Public lookup (no auth) ──────────────────────────────────────────────
  publicOverview: (u: string) => request<Overview>(pub(u, 'overview')),
  publicHeatmap: (u: string) => request<Heatmap>(pub(u, 'heatmap')),
  publicLanguages: (u: string, language?: string) =>
    request<Languages>(
      pub(u, 'languages') +
        (language ? `?language=${encodeURIComponent(language)}` : ''),
    ),
  publicCommitPatterns: (u: string) =>
    request<CommitPatterns>(pub(u, 'commit-patterns')),
  publicPrs: (u: string) => request<PRMetrics>(pub(u, 'prs')),
  publicRepos: (u: string) => request<Repos>(pub(u, 'repos')),
  publicStatus: (u: string) => request<PublicStatusResponse>(pub(u, 'status')),
  publicSync: (u: string) =>
    request<PublicSyncResponse>(pub(u, 'sync'), { method: 'POST' }),

  // ── Comparison (no auth) ─────────────────────────────────────────────────
  compare: (a: string, b: string) => request<CompareResponse>(cmp(a, b)),
  compareStatus: (a: string, b: string) =>
    request<CompareStatusResponse>(`${cmp(a, b)}/status`),
};

function pub(username: string, path: string): string {
  return `/api/public/${encodeURIComponent(username)}/${path}`;
}

function cmp(a: string, b: string): string {
  return `/api/compare/${encodeURIComponent(a)}/${encodeURIComponent(b)}`;
}

export const githubLoginUrl = `${API_URL}/auth/github`;
