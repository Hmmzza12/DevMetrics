/** Response shapes for the DevMetrics backend — mirrors src/services/metrics.ts on the API. */

export interface Me {
  id: number;
  username: string;
  avatar_url: string | null;
}

export interface Overview {
  total_commits: number;
  repo_count: number;
  total_stars: number;
  followers: number;
  current_streak: number;
  longest_streak: number;
}

export interface HeatmapDay {
  date: string;
  count: number;
}

export interface Heatmap {
  days: HeatmapDay[];
}

export interface LanguageBreakdown {
  language: string;
  bytes: number;
  percentage: number;
}

export interface LanguageRepo {
  id: number;
  name: string;
  stars: number;
  bytes: number;
}

export interface Languages {
  total_bytes: number;
  languages: LanguageBreakdown[];
  selected_language?: string;
  repos?: LanguageRepo[];
}

export interface CommitPatterns {
  by_day_of_week: { day: string; count: number }[];
  by_hour: { hour: number; count: number }[];
  grid: number[][]; // [dayOfWeek(0=Mon..6=Sun)][hour(0..23)]
}

export interface PRMetrics {
  total_prs: number;
  merged_count: number;
  merge_rate: number;
  avg_open_to_merge_hours: number | null;
  avg_first_review_hours: number | null;
  monthly: { month: string; count: number }[];
}

export interface Repo {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  is_private: boolean;
  commit_count: number;
  updated_at: string | null;
}

export interface Repos {
  repos: Repo[];
}

export type SyncStatus = 'pending' | 'processing' | 'done' | 'failed' | null;

export interface SyncStatusResponse {
  status: SyncStatus;
  progress: number;
  error: string | null;
  job_id: number | null;
  last_synced_at: string | null;
  rate_limit_reset_at: string | null;
}

export interface SyncTriggerResponse {
  job_id: number;
  status: SyncStatus;
}

export interface ReportSummary {
  summary: string;
  cached: boolean;
  generated_at: string;
}

// ── Public lookup ──────────────────────────────────────────────────────────
export interface PublicStatusResponse {
  exists: boolean;
  username: string | null;
  avatar_url: string | null;
  needs_sync: boolean;
  fresh: boolean;
  status: SyncStatus;
  progress: number;
  error: string | null;
  job_id: number | null;
  last_synced_at: string | null;
  rate_limit_reset_at: string | null;
  is_empty: boolean;
}

export interface PublicSyncResponse {
  job_id: number | null;
  status: SyncStatus;
  cached: boolean;
}
