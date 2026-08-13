import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.ts';
import { syncJobs, type SyncJob } from '../db/schema.ts';

/**
 * Turso-backed job queue for background syncs. No Redis — the `sync_jobs` table
 * *is* the queue. All status transitions live here so the worker and the API
 * share one source of truth.
 */

const ACTIVE: SyncJob['status'][] = ['pending', 'processing'];

/** The user's currently-active (pending or processing) job, if any. */
export async function getActiveJob(userId: number): Promise<SyncJob | undefined> {
  return db.query.syncJobs.findFirst({
    where: and(eq(syncJobs.userId, userId), inArray(syncJobs.status, ACTIVE)),
    orderBy: desc(syncJobs.createdAt),
  });
}

/** The user's most recent job of any status. */
export async function getLatestJob(userId: number): Promise<SyncJob | undefined> {
  return db.query.syncJobs.findFirst({
    where: eq(syncJobs.userId, userId),
    orderBy: desc(syncJobs.createdAt),
  });
}

export async function getJob(jobId: number): Promise<SyncJob | undefined> {
  return db.query.syncJobs.findFirst({ where: eq(syncJobs.id, jobId) });
}

/**
 * Create a pending job for the user — but only if one isn't already active.
 * Returns the job and whether it was newly created (so the caller knows
 * whether to spawn a worker).
 */
export async function createJob(
  userId: number,
): Promise<{ job: SyncJob; created: boolean }> {
  const existing = await getActiveJob(userId);
  if (existing) return { job: existing, created: false };

  const [job] = await db
    .insert(syncJobs)
    .values({ userId, status: 'pending', progress: 0 })
    .returning();
  return { job, created: true };
}

export async function markProcessing(jobId: number): Promise<void> {
  await db
    .update(syncJobs)
    .set({ status: 'processing', progress: 0, error: null })
    .where(eq(syncJobs.id, jobId));
}

export async function updateProgress(
  jobId: number,
  progress: number,
): Promise<void> {
  await db
    .update(syncJobs)
    .set({ progress: Math.max(0, Math.min(100, Math.round(progress))) })
    .where(eq(syncJobs.id, jobId));
}

export async function markDone(jobId: number): Promise<void> {
  await db
    .update(syncJobs)
    .set({ status: 'done', progress: 100, completedAt: new Date() })
    .where(eq(syncJobs.id, jobId));
}

export async function markFailed(
  jobId: number,
  error: string,
  rateLimitResetAt?: Date | null,
): Promise<void> {
  await db
    .update(syncJobs)
    .set({
      status: 'failed',
      error,
      completedAt: new Date(),
      rateLimitResetAt: rateLimitResetAt ?? null,
    })
    .where(eq(syncJobs.id, jobId));
}
