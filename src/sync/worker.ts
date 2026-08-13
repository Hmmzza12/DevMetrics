import { parentPort, workerData } from 'node:worker_threads';
import { libsql } from '../db/client.ts';
import { RateLimitError, UserNotFoundError } from '../github/client.ts';
import { markFailed } from './queue.ts';
import { runSync } from './runner.ts';

/**
 * Worker-thread entrypoint. Spawned by the manager with `workerData.jobId`.
 * Runs the sync pipeline and translates any failure into a `failed` job row —
 * a rate-limit abort is recorded as `rate_limit_low` with the reset time.
 */
const jobId = Number(
  (workerData as { jobId?: number } | undefined)?.jobId ?? NaN,
);

async function main() {
  if (!Number.isFinite(jobId)) {
    throw new Error('worker started without a valid jobId');
  }
  try {
    await runSync(jobId);
    parentPort?.postMessage({ type: 'done', jobId });
  } catch (err) {
    if (err instanceof RateLimitError) {
      await markFailed(jobId, 'rate_limit_low', err.resetAt);
    } else if (err instanceof UserNotFoundError) {
      await markFailed(jobId, 'user_not_found');
    } else {
      await markFailed(jobId, (err as Error)?.message ?? 'sync_failed');
    }
    parentPort?.postMessage({
      type: 'failed',
      jobId,
      error: (err as Error)?.message,
    });
  } finally {
    libsql.close();
  }
}

void main();
