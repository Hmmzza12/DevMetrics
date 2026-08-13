import type { FastifyInstance } from 'fastify';
import {
  compareProfiles,
  compareStatus,
  countSidesNeedingSync,
} from '../services/compare.ts';
import { consumeLookups } from '../lib/lookup-budget.ts';

interface CompareParams {
  userA: string;
  userB: string;
}

/**
 * Two-profile comparison API. Both routes are thin wrappers over the public
 * lookup pipeline (same cache, same `sync_jobs` queue) — see services/compare.ts.
 */
export async function compareRoutes(app: FastifyInstance): Promise<void> {
  // Combined data for both profiles. Sides resolve independently, so a missing
  // or invalid username is reported on that side with HTTP 200 rather than
  // failing the whole comparison.
  app.get('/api/compare/:userA/:userB', async (request, reply) => {
    const { userA, userB } = request.params as CompareParams;

    // Charge the shared per-IP budget for the sides that actually need a
    // GitHub fetch — two stale profiles cost two lookups, a fully cached
    // comparison costs nothing. Charged up front so a rejected request never
    // performs a partial sync.
    const cost = await countSidesNeedingSync(userA, userB);
    if (cost > 0) {
      const budget = consumeLookups(request.ip, cost);
      if (!budget.allowed) {
        return reply.code(429).send({
          error: 'rate_limited',
          reset_at: new Date(budget.resetAt).toISOString(),
        });
      }
    }

    try {
      return await compareProfiles(userA, userB);
    } catch (err) {
      request.log.error({ err }, 'compare failed');
      return reply.code(500).send({ error: 'compare_failed' });
    }
  });

  // Sync status for both sides so the UI can show partial progress. Pure DB
  // read — never hits GitHub, so it is not charged against the budget.
  app.get('/api/compare/:userA/:userB/status', async (request, reply) => {
    const { userA, userB } = request.params as CompareParams;
    try {
      return await compareStatus(userA, userB);
    } catch (err) {
      request.log.error({ err }, 'compare status failed');
      return reply.code(500).send({ error: 'compare_status_failed' });
    }
  });
}
