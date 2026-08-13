import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../lib/session.ts';
import { AnthropicNotConfiguredError } from '../services/anthropic.ts';
import {
  getCommitPatterns,
  getHeatmap,
  getLanguages,
  getOverview,
  getPRMetrics,
  getRepos,
  getReposByLanguage,
} from '../services/metrics.ts';
import { getOrGenerateSummary } from '../services/report.ts';
import { enqueueSync, getLatestJob } from '../sync/index.ts';

/**
 * The `/api/*` surface. Every route requires an authenticated session — the
 * preHandler attaches `request.user` / `request.userId`.
 */
export async function apiRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/api/overview', async (request) => {
    const user = request.user!;
    return getOverview(user.id, user.followers);
  });

  app.get('/api/heatmap', async (request) => {
    return getHeatmap(request.userId!);
  });

  app.get('/api/languages', async (request) => {
    const { language } = request.query as { language?: string };
    const breakdown = await getLanguages(request.userId!);
    if (language) {
      const repos = await getReposByLanguage(request.userId!, language);
      return { ...breakdown, selected_language: language, repos };
    }
    return breakdown;
  });

  app.get('/api/commit-patterns', async (request) => {
    return getCommitPatterns(request.userId!);
  });

  app.get('/api/prs', async (request) => {
    return getPRMetrics(request.userId!);
  });

  app.get('/api/repos', async (request) => {
    return getRepos(request.userId!);
  });

  // ── Sync ──────────────────────────────────────────────────────────────
  app.get('/api/sync/status', async (request) => {
    const user = request.user!;
    const job = await getLatestJob(user.id);
    return {
      status: job?.status ?? null,
      progress: job?.progress ?? 0,
      error: job?.error ?? null,
      job_id: job?.id ?? null,
      last_synced_at: user.lastSyncedAt ? user.lastSyncedAt.toISOString() : null,
      rate_limit_reset_at: job?.rateLimitResetAt
        ? job.rateLimitResetAt.toISOString()
        : null,
    };
  });

  app.post('/api/sync/trigger', async (request) => {
    const job = await enqueueSync(request.userId!);
    return { job_id: job.id, status: job.status };
  });

  // ── AI report summary ─────────────────────────────────────────────────
  app.post('/api/report/summary', async (request, reply) => {
    try {
      return await getOrGenerateSummary(request.user!);
    } catch (err) {
      if (err instanceof AnthropicNotConfiguredError) {
        return reply.code(503).send({
          error: 'anthropic_not_configured',
          message:
            'Set ANTHROPIC_API_KEY on the server to enable AI summaries.',
        });
      }
      request.log.error({ err }, 'summary generation failed');
      return reply.code(502).send({ error: 'summary_failed' });
    }
  });
}
