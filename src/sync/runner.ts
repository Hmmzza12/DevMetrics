import { eq } from 'drizzle-orm';
import { env } from '../config/env.ts';
import { db } from '../db/client.ts';
import {
  commitActivity,
  pullRequests,
  repoLanguages,
  repos,
  users,
} from '../db/schema.ts';
import {
  fetchAllRepos,
  fetchAllReposForLogin,
  fetchPullRequests,
  fetchPullRequestsForLogin,
  fetchRepoCommits,
  fetchUserIdentity,
  fetchViewer,
  type RateLimit,
} from '../github/client.ts';
import { decryptToken } from '../lib/crypto.ts';
import {
  getJob,
  markDone,
  markProcessing,
  updateProgress,
} from './queue.ts';

/**
 * The full sync pipeline. Runs inside a worker thread. Writes progress to the
 * `sync_jobs` row as it goes (25% repos → 50% commits → 75% PRs → 100% done).
 *
 * Throws RateLimitError / GitHubError on failure — the worker entrypoint is
 * responsible for translating that into a `failed` job status.
 */
export async function runSync(jobId: number): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error(`sync job ${jobId} not found`);

  const user = await db.query.users.findFirst({
    where: eq(users.id, job.userId),
  });
  if (!user) throw new Error(`user ${job.userId} not found`);

  // Public-lookup profiles have no stored token — they sync via the server PAT
  // and login-scoped (public-only) GraphQL queries. OAuth users use their own
  // decrypted token and the `viewer` queries (which include private repos).
  const isPublic = user.isPublicLookup;
  const login = user.username;
  const token = isPublic ? env.GITHUB_PAT : decryptToken(user.accessToken ?? '');
  if (isPublic && !token) {
    throw new Error('github_pat_not_configured');
  }

  await markProcessing(jobId);

  // Latest rate-limit snapshot — surfaced on the job if we later abort.
  let latestRateLimit: RateLimit | null = null;
  const onRateLimit = (rl: RateLimit) => {
    latestRateLimit = rl;
  };

  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

  // ── 0. Refresh identity (also gives us the node id for commit authorship) ──
  const viewer = isPublic
    ? await fetchUserIdentity(token, login)
    : await fetchViewer(token);

  // ── 1. Repositories + languages (→ 25%) ──────────────────────────────────
  const repoNodes = isPublic
    ? await fetchAllReposForLogin(token, login, onRateLimit)
    : await fetchAllRepos(token, onRateLimit);
  const repoIdByGithubId = new Map<number, number>();

  for (const r of repoNodes) {
    const [row] = await db
      .insert(repos)
      .values({
        githubId: r.githubId,
        ownerId: user.id,
        name: r.name,
        description: r.description,
        primaryLanguage: r.primaryLanguage,
        stars: r.stars,
        isPrivate: r.isPrivate,
        commitCount: 0,
        updatedAt: r.updatedAt ? new Date(r.updatedAt) : null,
      })
      .onConflictDoUpdate({
        target: repos.githubId,
        set: {
          ownerId: user.id,
          name: r.name,
          description: r.description,
          primaryLanguage: r.primaryLanguage,
          stars: r.stars,
          isPrivate: r.isPrivate,
          updatedAt: r.updatedAt ? new Date(r.updatedAt) : null,
        },
      })
      .returning({ id: repos.id });

    repoIdByGithubId.set(r.githubId, row.id);

    // Replace language rows for this repo.
    await db.delete(repoLanguages).where(eq(repoLanguages.repoId, row.id));
    const totalBytes = r.languages.reduce((s, l) => s + l.bytes, 0);
    if (r.languages.length > 0) {
      await db.insert(repoLanguages).values(
        r.languages.map((l) => ({
          repoId: row.id,
          language: l.name,
          bytes: l.bytes,
          percentage: totalBytes > 0 ? (l.bytes / totalBytes) * 100 : 0,
        })),
      );
    }
  }
  await updateProgress(jobId, 25);

  // ── 2. Commit history → daily + hourly aggregates (→ 50%) ────────────────
  const perDay = new Map<string, { count: number; hours: number[] }>();
  const commitReposeWithBranch = repoNodes.filter((r) => r.defaultBranch);
  let processed = 0;

  for (const r of commitReposeWithBranch) {
    const { dates, totalCount } = await fetchRepoCommits(
      token,
      r.ownerLogin,
      r.name,
      viewer.nodeId,
      since,
      onRateLimit,
    );

    for (const iso of dates) {
      const parsed = parseLocalTimestamp(iso);
      if (!parsed) continue;
      let bucket = perDay.get(parsed.date);
      if (!bucket) {
        bucket = { count: 0, hours: new Array(24).fill(0) };
        perDay.set(parsed.date, bucket);
      }
      bucket.count += 1;
      bucket.hours[parsed.hour] += 1;
    }

    const repoId = repoIdByGithubId.get(r.githubId);
    if (repoId) {
      await db
        .update(repos)
        .set({ commitCount: totalCount })
        .where(eq(repos.id, repoId));
    }

    processed += 1;
    // Nudge progress from 25 → 50 across the commit-fetch loop.
    const frac = commitReposeWithBranch.length
      ? processed / commitReposeWithBranch.length
      : 1;
    await updateProgress(jobId, 25 + Math.round(frac * 25));
  }

  // Replace the user's commit_activity with the freshly computed window.
  await db.delete(commitActivity).where(eq(commitActivity.ownerId, user.id));
  const activityRows = [...perDay.entries()].map(([date, b]) => ({
    ownerId: user.id,
    date,
    count: b.count,
    hourDistribution: JSON.stringify(
      Object.fromEntries(b.hours.map((v, i) => [i, v])),
    ),
  }));
  // Insert in chunks to stay well under SQLite's variable limit.
  for (let i = 0; i < activityRows.length; i += 200) {
    await db.insert(commitActivity).values(activityRows.slice(i, i + 200));
  }
  await updateProgress(jobId, 50);

  // ── 3. Pull requests (→ 75%) ─────────────────────────────────────────────
  const prNodes = isPublic
    ? await fetchPullRequestsForLogin(token, login, since, onRateLimit)
    : await fetchPullRequests(token, since, onRateLimit);
  await db.delete(pullRequests).where(eq(pullRequests.ownerId, user.id));
  if (prNodes.length > 0) {
    const prRows = prNodes.map((p) => ({
      githubId: p.githubId,
      repoId:
        p.repoGithubId != null
          ? (repoIdByGithubId.get(p.repoGithubId) ?? null)
          : null,
      ownerId: user.id,
      openedAt: p.createdAt ? new Date(p.createdAt) : null,
      mergedAt: p.mergedAt ? new Date(p.mergedAt) : null,
      firstReviewAt: p.firstReviewAt ? new Date(p.firstReviewAt) : null,
      wasMerged: p.merged,
    }));
    for (let i = 0; i < prRows.length; i += 200) {
      await db
        .insert(pullRequests)
        .values(prRows.slice(i, i + 200))
        .onConflictDoNothing({ target: pullRequests.githubId });
    }
  }
  await updateProgress(jobId, 75);

  // ── 4. Finalise (→ 100%) ─────────────────────────────────────────────────
  await db
    .update(users)
    .set({
      followers: viewer.followers,
      avatarUrl: viewer.avatarUrl,
      username: viewer.login,
      lastSyncedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  await markDone(jobId);
  void latestRateLimit; // captured for parity with failure path; not needed here
}

/**
 * Parse the *local* calendar date and hour from a GitHub committedDate. GitHub
 * returns the committer's original offset (e.g. `2024-03-05T14:22:01-05:00`),
 * so the date/hour in the string already reflect when the dev actually worked.
 */
function parseLocalTimestamp(
  iso: string,
): { date: string; hour: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):/.exec(iso);
  if (!m) return null;
  return { date: `${m[1]}-${m[2]}-${m[3]}`, hour: Number(m[4]) };
}
