import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { useDataSource, scopedKey } from '@/lib/data-source';
import {
  dashboardDataKeys,
  queryKeys,
  staleTimes,
} from '@/lib/query-client';

export const meQueryOptions = {
  queryKey: queryKeys.me,
  queryFn: api.me,
  retry: false,
} as const;

export function useMe() {
  return useQuery(meQueryOptions);
}

/**
 * The section hooks below are shared between the OAuth dashboard and the public
 * `/u/:username` dashboard. They read the DataSource context to choose the
 * endpoint and a correctly-namespaced query key — so the section components
 * (Overview, Heatmap, …) work unchanged in both modes.
 */
export function useOverview() {
  const src = useDataSource();
  return useQuery({
    queryKey: scopedKey(src, 'overview'),
    queryFn: () =>
      src.mode === 'public' ? api.publicOverview(src.username) : api.overview(),
    staleTime: staleTimes.overview,
  });
}

export function useHeatmap() {
  const src = useDataSource();
  return useQuery({
    queryKey: scopedKey(src, 'heatmap'),
    queryFn: () =>
      src.mode === 'public' ? api.publicHeatmap(src.username) : api.heatmap(),
    staleTime: staleTimes.heatmap,
  });
}

export function useLanguages(language?: string) {
  const src = useDataSource();
  return useQuery({
    queryKey: scopedKey(src, 'languages', language ?? null),
    queryFn: () =>
      src.mode === 'public'
        ? api.publicLanguages(src.username, language)
        : api.languages(language),
    staleTime: staleTimes.languages,
  });
}

export function useCommitPatterns() {
  const src = useDataSource();
  return useQuery({
    queryKey: scopedKey(src, 'commit-patterns'),
    queryFn: () =>
      src.mode === 'public'
        ? api.publicCommitPatterns(src.username)
        : api.commitPatterns(),
    staleTime: staleTimes.commitPatterns,
  });
}

export function usePRs() {
  const src = useDataSource();
  return useQuery({
    queryKey: scopedKey(src, 'prs'),
    queryFn: () =>
      src.mode === 'public' ? api.publicPrs(src.username) : api.prs(),
    staleTime: staleTimes.prs,
  });
}

export function useRepos() {
  const src = useDataSource();
  return useQuery({
    queryKey: scopedKey(src, 'repos'),
    queryFn: () =>
      src.mode === 'public' ? api.publicRepos(src.username) : api.repos(),
    staleTime: staleTimes.repos,
  });
}

/**
 * Polls /api/sync/status every 3s while a sync is pending/processing, stops
 * once it settles. On the pending/processing -> done transition, invalidates
 * every dashboard data key so the UI picks up fresh numbers.
 */
export function useSyncStatus() {
  const queryClient = useQueryClient();
  const wasSyncing = useRef(false);

  const query = useQuery({
    queryKey: queryKeys.syncStatus,
    queryFn: api.syncStatus,
    staleTime: staleTimes.syncStatus,
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === 'pending' || status === 'processing' ? 3000 : false;
    },
  });

  useEffect(() => {
    const status = query.data?.status;
    const syncing = status === 'pending' || status === 'processing';

    if (wasSyncing.current && !syncing && status === 'done') {
      for (const key of dashboardDataKeys) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    }
    wasSyncing.current = syncing;
  }, [query.data?.status, queryClient]);

  return query;
}
