/**
 * Per-IP budget for GitHub-touching public lookups.
 *
 * Why not `@fastify/rate-limit` for this: a comparison performs *two* profile
 * lookups in one request, so it has to consume two units of the *same* budget a
 * single lookup draws from. The plugin (v11) has no request-weight option, and
 * each route's `config.rateLimit` gets its own independent counter — so a
 * plugin-only setup would either give comparisons a separate budget (letting a
 * caller double their GitHub reach by using /compare) or charge them as one.
 *
 * This is deliberately a plain fixed-window counter: the routes it guards are
 * the only ones that can reach GitHub, and the process is single-instance.
 */

/** Lookups allowed per window, matching the previous single-lookup limit. */
export const LOOKUP_LIMIT = 10;
export const LOOKUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface Bucket {
  count: number;
  /** Epoch ms when this window expires and the count resets. */
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Drop expired buckets so the map can't grow without bound. */
function sweep(now: number): void {
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

let lastSweep = 0;

export interface BudgetResult {
  allowed: boolean;
  /** Units left after this call (0 when rejected). */
  remaining: number;
  /** Epoch ms when the window resets. */
  resetAt: number;
}

/**
 * Consume `cost` units for `key` (an IP). Rejects without consuming anything
 * when the remaining budget is smaller than the cost, so a comparison can never
 * be charged for a half-completed lookup.
 */
export function consumeLookups(
  key: string,
  cost: number,
  now: number = Date.now(),
): BudgetResult {
  // Amortised cleanup — at most once a minute, not on every request.
  if (now - lastSweep > 60_000) {
    sweep(now);
    lastSweep = now;
  }

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + LOOKUP_WINDOW_MS };
    buckets.set(key, bucket);
  }

  if (bucket.count + cost > LOOKUP_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += cost;
  return {
    allowed: true,
    remaining: LOOKUP_LIMIT - bucket.count,
    resetAt: bucket.resetAt,
  };
}

/** Test/maintenance helper — clears every bucket. */
export function resetLookupBudget(): void {
  buckets.clear();
  lastSweep = 0;
}
