import { UserNotFoundError, RateLimitError } from '../github/client.ts';
import {
  findPublicProfile,
  getPublicStatus,
  InvalidUsernameError,
  isFresh,
  needsGitHubFetch,
  normalizeAndValidate,
  PublicLookupDisabledError,
  triggerPublicSync,
} from './public-profiles.ts';
import {
  getCommitPatterns,
  getHeatmap,
  getLanguages,
  getOverview,
  getPRMetrics,
  getRepos,
} from './metrics.ts';

/**
 * Two-profile comparison, built entirely on the public-lookup pipeline: the
 * same `users` rows, the same 6h cache, the same `sync_jobs` queue. There is no
 * comparison-specific sync path and no comparison-specific job type — a compare
 * is just two public lookups resolved together.
 *
 * Each side resolves independently so one bad username never fails the other.
 */

/** How many repos to include per side (the UI shows a short list, not all). */
const REPO_SUMMARY_LIMIT = 5;

export type SideState =
  | 'ready' // synced data available
  | 'syncing' // sync queued or running
  | 'not_found' // GitHub has no such login
  | 'invalid' // not a well-formed GitHub username
  | 'rate_limited' // GitHub rate limit hit while resolving
  | 'unavailable' // public lookup disabled (no PAT)
  | 'error';

export interface CompareSideData {
  overview: Awaited<ReturnType<typeof getOverview>>;
  heatmap: Awaited<ReturnType<typeof getHeatmap>>;
  languages: Awaited<ReturnType<typeof getLanguages>>;
  commit_patterns: Awaited<ReturnType<typeof getCommitPatterns>>;
  prs: Awaited<ReturnType<typeof getPRMetrics>>;
  repos: Awaited<ReturnType<typeof getRepos>>['repos'];
}

export interface CompareSide {
  username: string;
  state: SideState;
  avatar_url: string | null;
  progress: number;
  error: string | null;
  reset_at: string | null;
  data: CompareSideData | null;
}

export interface CompareResult {
  userA: CompareSide;
  userB: CompareSide;
}

function errorSide(username: string, state: SideState, error: string | null = null): CompareSide {
  return {
    username,
    state,
    avatar_url: null,
    progress: 0,
    error,
    reset_at: null,
    data: null,
  };
}

/**
 * How many of the two sides would need a GitHub fetch right now. Callers use
 * this to charge the per-IP budget *before* any GitHub work starts, so a
 * comparison that syncs both profiles costs two lookups rather than one.
 * A fully-cached comparison costs nothing, which keeps shared links usable.
 */
export async function countSidesNeedingSync(
  rawA: string,
  rawB: string,
): Promise<number> {
  const [a, b] = await Promise.all([
    needsGitHubFetch(rawA),
    needsGitHubFetch(rawB),
  ]);
  return (a ? 1 : 0) + (b ? 1 : 0);
}

/** Load every metric for an already-synced profile. */
async function loadSideData(
  userId: number,
  followers: number,
): Promise<CompareSideData> {
  const [overview, heatmap, languages, commit_patterns, prs, repoList] =
    await Promise.all([
      getOverview(userId, followers),
      getHeatmap(userId),
      getLanguages(userId),
      getCommitPatterns(userId),
      getPRMetrics(userId),
      getRepos(userId),
    ]);

  return {
    overview,
    heatmap,
    languages,
    commit_patterns,
    prs,
    repos: repoList.repos.slice(0, REPO_SUMMARY_LIMIT),
  };
}

/**
 * Resolve one side: serve fresh cache directly, otherwise trigger a sync
 * through the shared queue. Never throws — every failure becomes a state.
 */
async function resolveSide(raw: string): Promise<CompareSide> {
  let username: string;
  try {
    username = normalizeAndValidate(raw);
  } catch {
    return errorSide(raw, 'invalid');
  }

  try {
    const result = await triggerPublicSync(username);
    const profile = await findPublicProfile(username);

    if (!profile) return errorSide(username, 'error', 'profile_missing');

    // Cached and fresh, or a previous sync already finished — serve the data.
    if (result.cached || (isFresh(profile) && profile.lastSyncedAt)) {
      return {
        username: profile.username,
        state: 'ready',
        avatar_url: profile.avatarUrl,
        progress: 100,
        error: null,
        reset_at: null,
        data: await loadSideData(profile.id, profile.followers),
      };
    }

    // A sync is queued or running. If the profile has older data we still show
    // it rather than a blank column — the UI refreshes when the job lands.
    return {
      username: profile.username,
      state: 'syncing',
      avatar_url: profile.avatarUrl,
      progress: 0,
      error: null,
      reset_at: null,
      data: profile.lastSyncedAt
        ? await loadSideData(profile.id, profile.followers)
        : null,
    };
  } catch (err) {
    if (err instanceof UserNotFoundError) return errorSide(username, 'not_found');
    if (err instanceof InvalidUsernameError) return errorSide(username, 'invalid');
    if (err instanceof PublicLookupDisabledError) {
      return errorSide(username, 'unavailable', 'public_lookup_disabled');
    }
    if (err instanceof RateLimitError) {
      return {
        ...errorSide(username, 'rate_limited', 'rate_limited'),
        reset_at: err.resetAt ? err.resetAt.toISOString() : null,
      };
    }
    throw err;
  }
}

/** Resolve both sides concurrently. */
export async function compareProfiles(
  rawA: string,
  rawB: string,
): Promise<CompareResult> {
  const [userA, userB] = await Promise.all([
    resolveSide(rawA),
    resolveSide(rawB),
  ]);
  return { userA, userB };
}

export interface CompareSideStatus {
  username: string;
  state: SideState;
  avatar_url: string | null;
  status: string | null;
  progress: number;
  error: string | null;
  fresh: boolean;
  is_empty: boolean;
}

/** Status for one side — a pure DB read, never touches GitHub. */
async function sideStatus(raw: string): Promise<CompareSideStatus> {
  let username: string;
  try {
    username = normalizeAndValidate(raw);
  } catch {
    return {
      username: raw,
      state: 'invalid',
      avatar_url: null,
      status: null,
      progress: 0,
      error: null,
      fresh: false,
      is_empty: false,
    };
  }

  const s = await getPublicStatus(username);

  let state: SideState;
  if (!s.exists) {
    // Unknown to us yet — the data request is what creates and syncs it.
    state = 'syncing';
  } else if (s.status === 'failed') {
    state = s.error === 'rate_limit_low' ? 'rate_limited' : 'error';
  } else if (s.last_synced_at) {
    state = s.status === 'pending' || s.status === 'processing' ? 'syncing' : 'ready';
  } else {
    state = 'syncing';
  }

  return {
    username: s.username ?? username,
    state,
    avatar_url: s.avatar_url,
    status: s.status,
    progress: s.progress,
    error: s.error,
    fresh: s.fresh,
    is_empty: s.is_empty,
  };
}

export async function compareStatus(
  rawA: string,
  rawB: string,
): Promise<{ userA: CompareSideStatus; userB: CompareSideStatus }> {
  const [userA, userB] = await Promise.all([sideStatus(rawA), sideStatus(rawB)]);
  return { userA, userB };
}
