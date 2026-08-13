import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/api/client';

export type PublicPhase = 'checking' | 'syncing' | 'ready' | 'error';

export interface PublicProfileState {
  phase: PublicPhase;
  progress: number;
  progressLabel: string;
  errorCode: string | null;
  resetAt: string | null;
  username: string;
  avatarUrl: string | null;
  isEmpty: boolean;
  retry: () => void;
}

const SECTION_KEYS = [
  'overview',
  'heatmap',
  'languages',
  'commit-patterns',
  'prs',
  'repos',
];

function labelFor(p: number): string {
  if (p < 25) return 'Fetching repositories…';
  if (p < 50) return 'Analyzing commit history…';
  if (p < 75) return 'Fetching pull requests…';
  if (p < 100) return 'Finishing up…';
  return 'Done';
}

/**
 * Drives a public profile: checks cache/sync status, triggers a sync when the
 * profile is missing or stale, polls every 2s while syncing, and refreshes the
 * section data once the sync completes. A fresh cache resolves straight to
 * `ready` without ever triggering a sync (no GitHub call).
 */
export function usePublicProfile(username: string): PublicProfileState {
  const queryClient = useQueryClient();
  const [syncError, setSyncError] = useState<{
    code: string;
    resetAt: string | null;
  } | null>(null);
  const triggered = useRef(false);
  const invalidatedForJob = useRef<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  const statusQuery = useQuery({
    queryKey: ['public', username, 'status', attempt],
    queryFn: () => api.publicStatus(username),
    staleTime: 0,
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d) return false;
      if (d.status === 'pending' || d.status === 'processing') return 2000;
      // Bridge the gap between triggering and the job row becoming visible.
      if (d.needs_sync && triggered.current && d.status !== 'failed') return 2000;
      return false;
    },
  });

  // Trigger a sync when the profile is missing or stale (once per attempt).
  useEffect(() => {
    const d = statusQuery.data;
    if (!d || syncError) return;
    if (d.needs_sync && !triggered.current) {
      triggered.current = true;
      api
        .publicSync(username)
        .then(() =>
          queryClient.invalidateQueries({
            queryKey: ['public', username, 'status', attempt],
          }),
        )
        .catch((err) => {
          if (err instanceof ApiError) {
            setSyncError({
              code: (err.body?.error as string) ?? err.message,
              resetAt: (err.body?.reset_at as string) ?? null,
            });
          } else {
            setSyncError({ code: 'network', resetAt: null });
          }
        });
    }
  }, [statusQuery.data, username, queryClient, attempt, syncError]);

  // Refresh section data once when a sync completes.
  useEffect(() => {
    const d = statusQuery.data;
    if (
      d?.status === 'done' &&
      d.job_id != null &&
      invalidatedForJob.current !== d.job_id
    ) {
      invalidatedForJob.current = d.job_id;
      for (const key of SECTION_KEYS) {
        void queryClient.invalidateQueries({
          queryKey: ['public', username, key],
        });
      }
    }
  }, [statusQuery.data, username, queryClient]);

  const retry = useCallback(() => {
    setSyncError(null);
    triggered.current = false;
    invalidatedForJob.current = null;
    setAttempt((a) => a + 1);
  }, []);

  // ── Derive the render phase ────────────────────────────────────────────
  let phase: PublicPhase = 'checking';
  let errorCode: string | null = null;
  let resetAt: string | null = null;
  let progress = 0;
  let isEmpty = false;
  let avatarUrl: string | null = null;

  const d = statusQuery.data;
  if (syncError) {
    phase = 'error';
    errorCode = syncError.code;
    resetAt = syncError.resetAt;
  } else if (statusQuery.isLoading && !d) {
    phase = 'checking';
  } else if (statusQuery.isError) {
    phase = 'error';
    const e = statusQuery.error;
    errorCode = e instanceof ApiError ? ((e.body?.error as string) ?? 'network') : 'network';
  } else if (d) {
    progress = d.progress;
    isEmpty = d.is_empty;
    avatarUrl = d.avatar_url;
    if (d.status === 'failed') {
      phase = 'error';
      errorCode = d.error ?? 'sync_failed';
      resetAt = d.rate_limit_reset_at;
    } else if (d.exists && d.last_synced_at) {
      phase = 'ready';
    } else {
      phase = 'syncing';
    }
  }

  return {
    phase,
    progress,
    progressLabel: labelFor(progress),
    errorCode,
    resetAt,
    username: d?.username ?? username,
    avatarUrl,
    isEmpty,
    retry,
  };
}
