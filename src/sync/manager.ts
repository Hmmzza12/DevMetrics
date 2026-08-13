import { Worker } from 'node:worker_threads';
import { SYNC_STALE_MS } from '../config/env.ts';
import type { SyncJob } from '../db/schema.ts';
import { createJob, markFailed } from './queue.ts';

/**
 * Owns the worker_threads lifecycle for background syncs.
 *
 * A worker is only spawned when `createJob` actually creates a new pending job,
 * which guarantees at most one active worker per user (the queue enforces the
 * single-active-job rule).
 */

const WORKER_URL = new URL('./worker.ts', import.meta.url);

function spawnWorker(jobId: number): void {
  const worker = new Worker(WORKER_URL, {
    workerData: { jobId },
    // Load tsx inside the worker so it can import the TypeScript sources.
    execArgv: ['--import', 'tsx'],
  });

  worker.on('error', async (err) => {
    console.error(`[sync] worker error for job ${jobId}:`, err);
    // Worker crashed before it could record its own failure.
    await markFailed(jobId, err?.message ?? 'worker_crashed').catch(() => {});
  });

  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[sync] worker for job ${jobId} exited with code ${code}`);
    }
  });
}

/**
 * Ensure a sync is running for the user. Returns the active or newly-created
 * job. Spawns a worker only for a freshly-created job.
 */
export async function enqueueSync(userId: number): Promise<SyncJob> {
  const { job, created } = await createJob(userId);
  if (created) spawnWorker(job.id);
  return job;
}

/**
 * Auto-trigger a sync on login when the user's data is stale (never synced or
 * older than SYNC_STALE_MS / 6 hours).
 */
export async function maybeAutoSync(
  userId: number,
  lastSyncedAt: Date | null,
): Promise<void> {
  const stale =
    !lastSyncedAt || Date.now() - lastSyncedAt.getTime() > SYNC_STALE_MS;
  if (stale) {
    await enqueueSync(userId);
  }
}
