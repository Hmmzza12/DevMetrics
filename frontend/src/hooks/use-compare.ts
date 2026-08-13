import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api } from '@/api/client';
import type { CompareSideState } from '@/api/types';

/** A side is settled once it will not change without a new request. */
function isSettled(state: CompareSideState): boolean {
  return state !== 'syncing';
}

/**
 * Drives a two-profile comparison.
 *
 * The data request is what creates and syncs missing profiles (it reuses the
 * public lookup pipeline), so it runs first and the status poll follows it.
 * While either side is still syncing we poll status every 2s and refetch the
 * data once a side settles — the cached side's real data stays on screen
 * throughout, so a slow profile never blanks the fast one.
 */
export function useCompare(userA: string, userB: string) {
  const queryClient = useQueryClient();
  const dataKey = ['compare', userA, userB] as const;
  const statusKey = ['compare', userA, userB, 'status'] as const;

  const dataQuery = useQuery({
    queryKey: dataKey,
    queryFn: () => api.compare(userA, userB),
    staleTime: 5 * 60 * 1000,
  });

  const anySyncing =
    dataQuery.data != null &&
    (!isSettled(dataQuery.data.userA.state) ||
      !isSettled(dataQuery.data.userB.state));

  const statusQuery = useQuery({
    queryKey: statusKey,
    queryFn: () => api.compareStatus(userA, userB),
    // Only poll once we know from the data response that something is syncing.
    enabled: anySyncing,
    staleTime: 0,
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d) return 2000;
      return isSettled(d.userA.state) && isSettled(d.userB.state) ? false : 2000;
    },
  });

  // When a side finishes syncing, pull the real data in.
  const settledRef = useRef<string>('');
  useEffect(() => {
    const s = statusQuery.data;
    if (!s) return;
    const signature = `${s.userA.state}:${s.userB.state}`;
    if (signature === settledRef.current) return;

    if (isSettled(s.userA.state) && isSettled(s.userB.state)) {
      settledRef.current = signature;
      void queryClient.invalidateQueries({ queryKey: dataKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusQuery.data, queryClient, userA, userB]);

  // Live progress for a syncing side, so the UI can show "Fetching userB… 60%".
  const progressA =
    statusQuery.data?.userA.progress ?? dataQuery.data?.userA.progress ?? 0;
  const progressB =
    statusQuery.data?.userB.progress ?? dataQuery.data?.userB.progress ?? 0;

  // Status is fresher than the data response for a side still in flight.
  const stateA = statusQuery.data?.userA.state ?? dataQuery.data?.userA.state;
  const stateB = statusQuery.data?.userB.state ?? dataQuery.data?.userB.state;

  return {
    isLoading: dataQuery.isLoading,
    isError: dataQuery.isError,
    error: dataQuery.error,
    sideA: dataQuery.data?.userA ?? null,
    sideB: dataQuery.data?.userB ?? null,
    stateA,
    stateB,
    progressA,
    progressB,
    refetch: () => void queryClient.invalidateQueries({ queryKey: dataKey }),
  };
}
