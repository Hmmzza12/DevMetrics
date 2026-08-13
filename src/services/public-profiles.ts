import { and, eq, sql } from 'drizzle-orm';
import { env, SYNC_STALE_MS } from '../config/env.ts';
import { db } from '../db/client.ts';
import { repos, users, type User } from '../db/schema.ts';
import { fetchUserIdentity } from '../github/client.ts';
import { enqueueSync } from '../sync/manager.ts';
import { getActiveJob, getLatestJob } from '../sync/queue.ts';

/**
 * Public-lookup profiles: fetched with the server PAT, stored as flagged,
 * tokenless rows in `users`, and cached for 6 hours (SYNC_STALE_MS). A fresh
 * cache is served straight from the DB — the GitHub API is only touched when a
 * profile is missing or stale.
 */

// GitHub username rules: 1–39 chars, alphanumeric or single hyphens, no
// leading/trailing hyphen and no consecutive hyphens.
const GITHUB_USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

export class InvalidUsernameError extends Error {
  constructor(public username: string) {
    super('invalid_username');
    this.name = 'InvalidUsernameError';
  }
}

export class PublicLookupDisabledError extends Error {
  constructor() {
    super('public_lookup_disabled');
    this.name = 'PublicLookupDisabledError';
  }
}

/** Strip a full profile URL down to a bare username. */
export function normalizeUsername(input: string): string {
  let s = (input ?? '').trim();
  s = s.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  s = s.replace(/^github\.com\//i, '');
  // Keep only the first path segment (drop /repo, ?tab=…, #anchor, trailing /).
  s = s.split(/[/?#]/)[0] ?? '';
  return s;
}

export function isValidUsername(username: string): boolean {
  return GITHUB_USERNAME_RE.test(username);
}

/** Normalize + validate, or throw InvalidUsernameError. */
export function normalizeAndValidate(input: string): string {
  const username = normalizeUsername(input);
  if (!isValidUsername(username)) throw new InvalidUsernameError(username);
  return username;
}

/** Case-insensitive lookup of a public profile row by username. */
export async function findPublicProfile(
  username: string,
): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: and(
      eq(users.isPublicLookup, true),
      sql`lower(${users.username}) = ${username.toLowerCase()}`,
    ),
  });
}

/** A profile is fresh if it synced within the cache window (6h). */
export function isFresh(profile: User): boolean {
  return (
    profile.lastSyncedAt != null &&
    Date.now() - profile.lastSyncedAt.getTime() < SYNC_STALE_MS
  );
}

export interface TriggerResult {
  jobId: number | null;
  status: string;
  cached: boolean;
}

/**
 * Trigger (or serve from cache) a public sync. Returns immediately with
 * `cached: true` when a fresh profile already exists — importantly WITHOUT
 * hitting the GitHub API. Otherwise verifies the login exists (PAT), upserts the
 * tokenless profile row, and enqueues a sync on the shared worker pipeline.
 *
 * Throws: InvalidUsernameError (422), UserNotFoundError (404),
 * RateLimitError (403), PublicLookupDisabledError (503).
 */
export async function triggerPublicSync(input: string): Promise<TriggerResult> {
  const username = normalizeAndValidate(input);

  const existing = await findPublicProfile(username);
  if (existing && isFresh(existing)) {
    return { jobId: null, status: 'done', cached: true };
  }
  // If a sync is already running for this profile, return it rather than
  // starting a second (the queue enforces one active job per profile anyway).
  if (existing) {
    const active = await getActiveJob(existing.id);
    if (active) return { jobId: active.id, status: active.status, cached: false };
  }

  if (!env.GITHUB_PAT) throw new PublicLookupDisabledError();

  // Verify the login exists (throws UserNotFoundError / RateLimitError).
  const identity = await fetchUserIdentity(env.GITHUB_PAT, username);

  let profile = await findPublicProfile(identity.login);
  if (profile) {
    await db
      .update(users)
      .set({
        username: identity.login,
        avatarUrl: identity.avatarUrl,
        followers: identity.followers,
      })
      .where(eq(users.id, profile.id));
  } else {
    const [row] = await db
      .insert(users)
      .values({
        githubId: null, // public rows never claim the unique github_id
        username: identity.login,
        avatarUrl: identity.avatarUrl,
        accessToken: null,
        isPublicLookup: true,
        followers: identity.followers,
      })
      .returning();
    profile = row;
  }

  const job = await enqueueSync(profile.id);
  return { jobId: job.id, status: job.status, cached: false };
}

export interface PublicStatus {
  exists: boolean;
  username: string | null;
  avatar_url: string | null;
  needs_sync: boolean;
  fresh: boolean;
  status: string | null;
  progress: number;
  error: string | null;
  job_id: number | null;
  last_synced_at: string | null;
  rate_limit_reset_at: string | null;
  is_empty: boolean;
}

/** Cache/sync status for a username — a pure DB read, never hits GitHub. */
export async function getPublicStatus(input: string): Promise<PublicStatus> {
  const username = normalizeAndValidate(input);
  const profile = await findPublicProfile(username);

  if (!profile) {
    return {
      exists: false,
      username: null,
      avatar_url: null,
      needs_sync: true,
      fresh: false,
      status: null,
      progress: 0,
      error: null,
      job_id: null,
      last_synced_at: null,
      rate_limit_reset_at: null,
      is_empty: false,
    };
  }

  const job = await getLatestJob(profile.id);
  const active = job?.status === 'pending' || job?.status === 'processing';
  const fresh = isFresh(profile);

  let isEmpty = false;
  if (profile.lastSyncedAt) {
    isEmpty = (await countRepos(profile.id)) === 0;
  }

  return {
    exists: true,
    username: profile.username,
    avatar_url: profile.avatarUrl,
    needs_sync: !fresh && !active,
    fresh,
    status: job?.status ?? null,
    progress: job?.progress ?? 0,
    error: job?.error ?? null,
    job_id: job?.id ?? null,
    last_synced_at: profile.lastSyncedAt
      ? profile.lastSyncedAt.toISOString()
      : null,
    rate_limit_reset_at: job?.rateLimitResetAt
      ? job.rateLimitResetAt.toISOString()
      : null,
    is_empty: isEmpty,
  };
}

async function countRepos(ownerId: number): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(repos)
    .where(eq(repos.ownerId, ownerId));
  return Number(n);
}
