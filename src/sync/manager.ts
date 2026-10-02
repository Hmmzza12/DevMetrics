import { Worker } from 'node:worker_threads';
import { waitUntil } from '@vercel/functions';
import { SYNC_STALE_MS } from '../config/env.js';
import type { SyncJob } from '../db/schema.js';
import { RateLimitError, UserNotFoundError } from '../github/client.js';
import { createJob, markFailed } from './queue.js';
import { runSync } from './runner.js';

/**
 * Owns the worker_threads lifecycle for background syncs.
 *
 * A worker is only spawned when `createJob` actually creates a new pending job,
 * which guarantees at most one active worker per user (the queue enforces the
 * single-active-job rule).
 */

// Plain .mjs entry that registers the tsx loader in-thread (via `tsx/esm/api`)
// before importing worker.ts. `--import` execArgv loader hooks don't reliably
// propagate into worker_threads on some Node versions, which was silently
// failing every sync in production — this sidesteps that entirely.
const WORKER_URL = new URL('./worker-entry.mjs', import.meta.url);

function spawnWorker(jobId: number): void {
  const worker = new Worker(WORKER_URL, {
    workerData: { jobId },
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
 * Vercel Functions cannot leave an independent worker running after the HTTP
 * response completes. `waitUntil` keeps the invocation alive while the same
 * sync pipeline processes the Turso-backed job. Traditional Node hosts keep
 * using the worker-thread path above.
 */
async function runServerlessJob(jobId: number): Promise<void> {
  try {
    await runSync(jobId);
  } catch (err) {
    if (err instanceof RateLimitError) {
      await markFailed(jobId, 'rate_limit_low', err.resetAt);
    } else if (err instanceof UserNotFoundError) {
      await markFailed(jobId, 'user_not_found');
    } else {
      await markFailed(jobId, (err as Error)?.message ?? 'sync_failed');
    }
  }
}

/**
 * Ensure a sync is running for the user. Returns the active or newly-created
 * job. Spawns a worker only for a freshly-created job.
 */
export async function enqueueSync(userId: number): Promise<SyncJob> {
  const { job, created } = await createJob(userId);
  if (created) {
    if (process.env.VERCEL) {
      waitUntil(runServerlessJob(job.id));
    } else {
      spawnWorker(job.id);
    }
  }
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
