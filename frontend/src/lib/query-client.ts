import { QueryClient } from '@tanstack/react-query';

/**
 * Central query key registry. Keeping these here (rather than inline at each
 * call site) is what makes cross-invalidation on sync completion reliable.
 */
export const queryKeys = {
  overview: ['overview'] as const,
  heatmap: ['heatmap'] as const,
  languages: ['languages'] as const,
  commitPatterns: ['commit-patterns'] as const,
  prs: ['prs'] as const,
  repos: ['repos'] as const,
  syncStatus: ['sync-status'] as const,
  me: ['me'] as const,
  reportSummary: ['report-summary'] as const,
};

/** All dashboard data keys — invalidated together when a sync completes. */
export const dashboardDataKeys = [
  queryKeys.overview,
  queryKeys.heatmap,
  queryKeys.languages,
  queryKeys.commitPatterns,
  queryKeys.prs,
  queryKeys.repos,
];

const FIVE_MIN = 5 * 60 * 1000;
const TEN_MIN = 10 * 60 * 1000;

export const staleTimes = {
  overview: FIVE_MIN,
  heatmap: TEN_MIN,
  languages: TEN_MIN,
  commitPatterns: TEN_MIN,
  prs: FIVE_MIN,
  repos: FIVE_MIN,
  syncStatus: 0,
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
