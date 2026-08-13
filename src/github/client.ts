import { RATE_LIMIT_FLOOR } from '../config/env.ts';
import {
  COMMITS_QUERY,
  PRS_QUERY,
  REPOS_QUERY,
  USER_IDENTITY_QUERY,
  USER_PRS_QUERY,
  USER_REPOS_QUERY,
  VIEWER_QUERY,
} from './queries.ts';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

// ── Errors ─────────────────────────────────────────────────────────────────
export class GitHubError extends Error {
  status?: number;
  /** GraphQL error `type` (e.g. 'NOT_FOUND', 'RATE_LIMITED') when present. */
  type?: string;
  constructor(message: string, status?: number, type?: string) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
    this.type = type;
  }
}

/** Thrown when the GraphQL rate-limit budget is too low to continue safely. */
export class RateLimitError extends Error {
  resetAt: Date | null;
  constructor(resetAt: Date | null) {
    super('rate_limit_low');
    this.name = 'RateLimitError';
    this.resetAt = resetAt;
  }
}

/** Thrown when a requested public login does not exist on GitHub. */
export class UserNotFoundError extends Error {
  login: string;
  constructor(login: string) {
    super('user_not_found');
    this.name = 'UserNotFoundError';
    this.login = login;
  }
}

// ── Shared types ─────────────────────────────────────────────────────────────
export interface RateLimit {
  limit: number;
  remaining: number;
  resetAt: string;
  cost: number;
}

export interface ViewerIdentity {
  nodeId: string;
  githubId: number;
  login: string;
  avatarUrl: string | null;
  followers: number;
}

export interface RepoNode {
  githubId: number;
  name: string;
  description: string | null;
  isPrivate: boolean;
  stars: number;
  updatedAt: string | null;
  ownerLogin: string;
  primaryLanguage: string | null;
  defaultBranch: string | null;
  languages: { name: string; bytes: number }[];
}

export interface PullRequestNode {
  githubId: number;
  repoGithubId: number | null;
  createdAt: string | null;
  mergedAt: string | null;
  merged: boolean;
  firstReviewAt: string | null;
}

// ── Low-level GraphQL call ───────────────────────────────────────────────────
async function graphql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<{ data: T; rateLimit: RateLimit | null }> {
  let res: Response;
  try {
    res = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DevMetrics',
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (err) {
    throw new GitHubError(
      `network error contacting GitHub: ${(err as Error).message}`,
    );
  }

  if (res.status === 401) {
    throw new GitHubError('github token unauthorized', 401);
  }

  // Secondary/abuse rate limiting surfaces as 403 or 429 with a Retry-After.
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset');
    const resetAt = reset ? new Date(Number(reset) * 1000) : null;
    throw new RateLimitError(resetAt);
  }

  const json = (await res.json()) as {
    data?: T & { rateLimit?: RateLimit };
    errors?: { type?: string; message: string }[];
  };

  if (json.errors?.length) {
    if (json.errors.some((e) => e.type === 'RATE_LIMITED')) {
      throw new RateLimitError(null);
    }
    throw new GitHubError(
      json.errors.map((e) => e.message).join('; '),
      undefined,
      json.errors[0]?.type,
    );
  }

  const rateLimit = (json.data as { rateLimit?: RateLimit } | undefined)
    ?.rateLimit;
  return { data: json.data as T, rateLimit: rateLimit ?? null };
}

/**
 * Guard the remaining rate-limit budget. Throws RateLimitError (with reset
 * time) when we're below the floor, so the caller can abort gracefully.
 */
function assertBudget(rateLimit: RateLimit | null): void {
  if (rateLimit && rateLimit.remaining < RATE_LIMIT_FLOOR) {
    throw new RateLimitError(new Date(rateLimit.resetAt));
  }
}

// ── Viewer identity ──────────────────────────────────────────────────────────
export async function fetchViewer(token: string): Promise<ViewerIdentity> {
  const { data } = await graphql<{
    viewer: {
      id: string;
      databaseId: number;
      login: string;
      avatarUrl: string | null;
      followers: { totalCount: number };
    };
  }>(token, VIEWER_QUERY);

  const v = data.viewer;
  return {
    nodeId: v.id,
    githubId: v.databaseId,
    login: v.login,
    avatarUrl: v.avatarUrl,
    followers: v.followers.totalCount,
  };
}

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

// ── Repositories ─────────────────────────────────────────────────────────────
interface RawRepoNode {
  databaseId: number;
  name: string;
  description: string | null;
  isPrivate: boolean;
  stargazerCount: number;
  updatedAt: string | null;
  owner: { login: string };
  primaryLanguage: { name: string } | null;
  defaultBranchRef: { name: string } | null;
  languages: {
    totalSize: number;
    edges: { size: number; node: { name: string } }[];
  } | null;
}

interface ReposResponse {
  viewer: { repositories: { pageInfo: PageInfo; nodes: RawRepoNode[] } };
}

/**
 * Fetch all owned repositories (paginated). `onRateLimit` receives the latest
 * rate-limit snapshot after every page so the caller can record the reset time.
 */
export async function fetchAllRepos(
  token: string,
  onRateLimit?: (rl: RateLimit) => void,
  maxRepos = 300,
): Promise<RepoNode[]> {
  const repos: RepoNode[] = [];
  let cursor: string | null = null;

  do {
    const variables: Record<string, unknown> = { cursor };
    const { data, rateLimit } = await graphql<ReposResponse>(
      token,
      REPOS_QUERY,
      variables,
    );

    if (rateLimit) onRateLimit?.(rateLimit);
    assertBudget(rateLimit);

    const conn = data.viewer.repositories;
    for (const node of conn.nodes) {
      repos.push({
        githubId: node.databaseId,
        name: node.name,
        description: node.description,
        isPrivate: node.isPrivate,
        stars: node.stargazerCount,
        updatedAt: node.updatedAt,
        ownerLogin: node.owner.login,
        primaryLanguage: node.primaryLanguage?.name ?? null,
        defaultBranch: node.defaultBranchRef?.name ?? null,
        languages: (node.languages?.edges ?? []).map((e) => ({
          name: e.node.name,
          bytes: e.size,
        })),
      });
    }

    cursor = conn.pageInfo.hasNextPage ? conn.pageInfo.endCursor : null;
  } while (cursor && repos.length < maxRepos);

  return repos;
}

// ── Commit history ───────────────────────────────────────────────────────────
interface CommitsResponse {
  repository: {
    defaultBranchRef: {
      target: {
        history?: {
          totalCount: number;
          pageInfo: PageInfo;
          nodes: { committedDate: string }[];
        };
      } | null;
    } | null;
  } | null;
}

/**
 * Fetch committedDate ISO strings for the viewer's commits on a repo's default
 * branch since `since`. Returns the raw ISO timestamps (with original offset)
 * plus the total count. Paginates up to `maxPages` * 100 commits per repo.
 */
export async function fetchRepoCommits(
  token: string,
  owner: string,
  name: string,
  authorNodeId: string,
  since: string,
  onRateLimit?: (rl: RateLimit) => void,
  maxPages = 20,
): Promise<{ dates: string[]; totalCount: number }> {
  const dates: string[] = [];
  let cursor: string | null = null;
  let totalCount = 0;
  let pages = 0;

  do {
    const variables: Record<string, unknown> = {
      owner,
      name,
      authorId: authorNodeId,
      since,
      cursor,
    };
    const { data, rateLimit } = await graphql<CommitsResponse>(
      token,
      COMMITS_QUERY,
      variables,
    );

    if (rateLimit) onRateLimit?.(rateLimit);
    assertBudget(rateLimit);

    const history = data.repository?.defaultBranchRef?.target?.history;
    if (!history) break; // empty repo / no default branch

    totalCount = history.totalCount;
    for (const node of history.nodes) dates.push(node.committedDate);

    cursor = history.pageInfo.hasNextPage ? history.pageInfo.endCursor : null;
    pages += 1;
  } while (cursor && pages < maxPages);

  return { dates, totalCount };
}

// ── Pull requests ────────────────────────────────────────────────────────────
interface RawPrNode {
  databaseId: number;
  createdAt: string | null;
  mergedAt: string | null;
  merged: boolean;
  repository: { databaseId: number } | null;
  reviews: { nodes: { submittedAt: string | null }[] };
}

interface PrsResponse {
  viewer: { pullRequests: { pageInfo: PageInfo; nodes: RawPrNode[] } };
}

/**
 * Fetch the viewer's authored PRs created on/after `sinceIso`. PRs are ordered
 * newest-first, so we stop paginating once we pass the cutoff.
 */
export async function fetchPullRequests(
  token: string,
  sinceIso: string,
  onRateLimit?: (rl: RateLimit) => void,
  maxPages = 20,
): Promise<PullRequestNode[]> {
  const since = new Date(sinceIso).getTime();
  const prs: PullRequestNode[] = [];
  let cursor: string | null = null;
  let pages = 0;

  do {
    const variables: Record<string, unknown> = { cursor };
    const { data, rateLimit } = await graphql<PrsResponse>(
      token,
      PRS_QUERY,
      variables,
    );

    if (rateLimit) onRateLimit?.(rateLimit);
    assertBudget(rateLimit);

    const conn = data.viewer.pullRequests;
    let reachedCutoff = false;

    for (const node of conn.nodes) {
      const created = node.createdAt ? new Date(node.createdAt).getTime() : 0;
      if (created < since) {
        reachedCutoff = true;
        break;
      }
      const reviewTimes = node.reviews.nodes
        .map((r) => r.submittedAt)
        .filter((s): s is string => Boolean(s))
        .map((s) => new Date(s).getTime());
      const firstReview =
        reviewTimes.length > 0
          ? new Date(Math.min(...reviewTimes)).toISOString()
          : null;

      prs.push({
        githubId: node.databaseId,
        repoGithubId: node.repository?.databaseId ?? null,
        createdAt: node.createdAt,
        mergedAt: node.mergedAt,
        merged: node.merged,
        firstReviewAt: firstReview,
      });
    }

    if (reachedCutoff) break;
    cursor = conn.pageInfo.hasNextPage ? conn.pageInfo.endCursor : null;
    pages += 1;
  } while (cursor && pages < maxPages);

  return prs;
}

// ── Login-scoped fetchers (public lookups via the server PAT) ────────────────
interface UserIdentityResponse {
  user: {
    id: string;
    databaseId: number;
    login: string;
    avatarUrl: string | null;
    followers: { totalCount: number };
  } | null;
}

interface UserReposResponse {
  user: {
    repositories: { pageInfo: PageInfo; nodes: RawRepoNode[] };
  } | null;
}

interface UserPrsResponse {
  user: {
    pullRequests: { pageInfo: PageInfo; nodes: RawPrNode[] };
  } | null;
}

/**
 * Identity of an arbitrary public login. Throws UserNotFoundError when GitHub
 * reports no such user (so the caller can return a clean 404).
 */
export async function fetchUserIdentity(
  token: string,
  login: string,
): Promise<ViewerIdentity> {
  let data: UserIdentityResponse;
  try {
    ({ data } = await graphql<UserIdentityResponse>(token, USER_IDENTITY_QUERY, {
      login,
    }));
  } catch (err) {
    // GitHub reports a missing login as a NOT_FOUND GraphQL error (with
    // data.user null alongside it), so the throw beats the null-check below.
    if (
      err instanceof GitHubError &&
      (err.type === 'NOT_FOUND' || /Could not resolve to a User/i.test(err.message))
    ) {
      throw new UserNotFoundError(login);
    }
    throw err;
  }
  if (!data.user) throw new UserNotFoundError(login);
  const u = data.user;
  return {
    nodeId: u.id,
    githubId: u.databaseId,
    login: u.login,
    avatarUrl: u.avatarUrl,
    followers: u.followers.totalCount,
  };
}

/** All public repositories owned by `login` (paginated). */
export async function fetchAllReposForLogin(
  token: string,
  login: string,
  onRateLimit?: (rl: RateLimit) => void,
  maxRepos = 300,
): Promise<RepoNode[]> {
  const repos: RepoNode[] = [];
  let cursor: string | null = null;

  do {
    const variables: Record<string, unknown> = { login, cursor };
    const { data, rateLimit } = await graphql<UserReposResponse>(
      token,
      USER_REPOS_QUERY,
      variables,
    );

    if (rateLimit) onRateLimit?.(rateLimit);
    assertBudget(rateLimit);

    if (!data.user) throw new UserNotFoundError(login);
    const conn = data.user.repositories;
    for (const node of conn.nodes) {
      repos.push({
        githubId: node.databaseId,
        name: node.name,
        description: node.description,
        isPrivate: node.isPrivate,
        stars: node.stargazerCount,
        updatedAt: node.updatedAt,
        ownerLogin: node.owner.login,
        primaryLanguage: node.primaryLanguage?.name ?? null,
        defaultBranch: node.defaultBranchRef?.name ?? null,
        languages: (node.languages?.edges ?? []).map((e) => ({
          name: e.node.name,
          bytes: e.size,
        })),
      });
    }

    cursor = conn.pageInfo.hasNextPage ? conn.pageInfo.endCursor : null;
  } while (cursor && repos.length < maxRepos);

  return repos;
}

/** Pull requests authored by `login`, created on/after `sinceIso`. */
export async function fetchPullRequestsForLogin(
  token: string,
  login: string,
  sinceIso: string,
  onRateLimit?: (rl: RateLimit) => void,
  maxPages = 20,
): Promise<PullRequestNode[]> {
  const since = new Date(sinceIso).getTime();
  const prs: PullRequestNode[] = [];
  let cursor: string | null = null;
  let pages = 0;

  do {
    const variables: Record<string, unknown> = { login, cursor };
    const { data, rateLimit } = await graphql<UserPrsResponse>(
      token,
      USER_PRS_QUERY,
      variables,
    );

    if (rateLimit) onRateLimit?.(rateLimit);
    assertBudget(rateLimit);

    if (!data.user) throw new UserNotFoundError(login);
    const conn = data.user.pullRequests;
    let reachedCutoff = false;

    for (const node of conn.nodes) {
      const created = node.createdAt ? new Date(node.createdAt).getTime() : 0;
      if (created < since) {
        reachedCutoff = true;
        break;
      }
      const reviewTimes = node.reviews.nodes
        .map((r) => r.submittedAt)
        .filter((s): s is string => Boolean(s))
        .map((s) => new Date(s).getTime());
      const firstReview =
        reviewTimes.length > 0
          ? new Date(Math.min(...reviewTimes)).toISOString()
          : null;

      prs.push({
        githubId: node.databaseId,
        repoGithubId: node.repository?.databaseId ?? null,
        createdAt: node.createdAt,
        mergedAt: node.mergedAt,
        merged: node.merged,
        firstReviewAt: firstReview,
      });
    }

    if (reachedCutoff) break;
    cursor = conn.pageInfo.hasNextPage ? conn.pageInfo.endCursor : null;
    pages += 1;
  } while (cursor && pages < maxPages);

  return prs;
}
