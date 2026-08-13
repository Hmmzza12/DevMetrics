import type { FastifyInstance, FastifyReply } from 'fastify';
import { RateLimitError, UserNotFoundError } from '../github/client.ts';
import type { User } from '../db/schema.ts';
import {
  getCommitPatterns,
  getHeatmap,
  getLanguages,
  getOverview,
  getPRMetrics,
  getRepos,
  getReposByLanguage,
} from '../services/metrics.ts';
import {
  findPublicProfile,
  getPublicStatus,
  InvalidUsernameError,
  needsGitHubFetch,
  normalizeAndValidate,
  PublicLookupDisabledError,
  triggerPublicSync,
} from '../services/public-profiles.ts';
import { consumeLookups } from '../lib/lookup-budget.ts';

interface UsernameParams {
  username: string;
}

/**
 * Public (no-login) lookup API. Read endpoints are pure DB reads scoped by
 * username — they never touch GitHub. Only POST /sync reaches the GitHub API,
 * and it is the only per-IP rate-limited route (so cached reads are free).
 */
export async function publicRoutes(app: FastifyInstance): Promise<void> {
  // Resolve a validated, existing public profile, or send the right error.
  async function resolveProfile(
    reply: FastifyReply,
    raw: string,
  ): Promise<User | null> {
    let username: string;
    try {
      username = normalizeAndValidate(raw);
    } catch {
      reply.code(422).send({ error: 'invalid_username' });
      return null;
    }
    const profile = await findPublicProfile(username);
    if (!profile) {
      reply.code(404).send({ error: 'profile_not_found' });
      return null;
    }
    return profile;
  }

  app.get('/api/public/:username/overview', async (request, reply) => {
    const p = await resolveProfile(reply, (request.params as UsernameParams).username);
    if (!p) return;
    return getOverview(p.id, p.followers);
  });

  app.get('/api/public/:username/heatmap', async (request, reply) => {
    const p = await resolveProfile(reply, (request.params as UsernameParams).username);
    if (!p) return;
    return getHeatmap(p.id);
  });

  app.get('/api/public/:username/languages', async (request, reply) => {
    const p = await resolveProfile(reply, (request.params as UsernameParams).username);
    if (!p) return;
    const { language } = request.query as { language?: string };
    const breakdown = await getLanguages(p.id);
    if (language) {
      const repos = await getReposByLanguage(p.id, language);
      return { ...breakdown, selected_language: language, repos };
    }
    return breakdown;
  });

  app.get('/api/public/:username/commit-patterns', async (request, reply) => {
    const p = await resolveProfile(reply, (request.params as UsernameParams).username);
    if (!p) return;
    return getCommitPatterns(p.id);
  });

  app.get('/api/public/:username/prs', async (request, reply) => {
    const p = await resolveProfile(reply, (request.params as UsernameParams).username);
    if (!p) return;
    return getPRMetrics(p.id);
  });

  app.get('/api/public/:username/repos', async (request, reply) => {
    const p = await resolveProfile(reply, (request.params as UsernameParams).username);
    if (!p) return;
    return getRepos(p.id);
  });

  // Cache/sync status — pure DB read, unlimited, never hits GitHub.
  app.get('/api/public/:username/status', async (request, reply) => {
    try {
      return await getPublicStatus((request.params as UsernameParams).username);
    } catch (err) {
      if (err instanceof InvalidUsernameError) {
        return reply.code(422).send({ error: 'invalid_username' });
      }
      throw err;
    }
  });

  // Trigger a public sync. Charged against the shared per-IP lookup budget
  // (see lib/lookup-budget.ts) — the same bucket /api/compare draws two units
  // from, so comparisons can't be used to double a caller's GitHub reach.
  app.post(
    '/api/public/:username/sync',
    async (request, reply) => {
      const raw = (request.params as UsernameParams).username;

      // Only a lookup that will actually reach GitHub costs budget; serving a
      // fresh cache is free.
      const cost = (await needsGitHubFetch(raw)) ? 1 : 0;
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
        const result = await triggerPublicSync(raw);
        return {
          job_id: result.jobId,
          status: result.status,
          cached: result.cached,
        };
      } catch (err) {
        if (err instanceof InvalidUsernameError) {
          return reply.code(422).send({ error: 'invalid_username' });
        }
        if (err instanceof UserNotFoundError) {
          return reply.code(404).send({ error: 'user_not_found' });
        }
        if (err instanceof RateLimitError) {
          return reply.code(403).send({
            error: 'rate_limited',
            reset_at: err.resetAt ? err.resetAt.toISOString() : null,
          });
        }
        if (err instanceof PublicLookupDisabledError) {
          return reply.code(503).send({ error: 'public_lookup_disabled' });
        }
        request.log.error({ err }, 'public sync failed');
        return reply.code(500).send({ error: 'sync_failed' });
      }
    },
  );
}
