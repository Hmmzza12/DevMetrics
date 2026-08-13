import type { FastifyInstance } from 'fastify';
import { env, isProd } from '../config/env.ts';
import { db } from '../db/client.ts';
import {
  clearUserSession,
  requireAuth,
  setUserSession,
} from '../lib/session.ts';
import { upsertUserFromToken } from '../services/users.ts';
import { maybeAutoSync } from '../sync/manager.ts';

/**
 * Auth routes. The OAuth *start* route (`GET /auth/github`) is registered by
 * the @fastify/oauth2 plugin via `startRedirectPath`; here we handle the
 * callback, logout, and the current-user probe.
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  // GET /auth/github/callback — exchange the code, upsert the user, set session.
  app.get('/auth/github/callback', async (request, reply) => {
    try {
      const { token } =
        await app.githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      const user = await upsertUserFromToken(token.access_token);
      setUserSession(request, user.id);

      // Kick off a background sync if the user's data is stale (or brand new).
      await maybeAutoSync(user.id, user.lastSyncedAt ?? null);

      return reply.redirect(`${env.FRONTEND_URL}/dashboard`);
    } catch (err) {
      request.log.error({ err }, 'oauth callback failed');
      return reply.redirect(`${env.FRONTEND_URL}/?auth_error=1`);
    }
  });

  // POST /auth/logout — clear the session cookie.
  app.post('/auth/logout', async (request, reply) => {
    clearUserSession(request);
    return reply.send({ ok: true });
  });

  // GET /auth/me — current user, or 401.
  app.get(
    '/auth/me',
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = request.user!;
      return reply.send({
        id: user.id,
        username: user.username,
        avatar_url: user.avatarUrl,
      });
    },
  );

  // Dev-only: mint a session for an already-synced user without going
  // through GitHub OAuth again. Never registered outside NODE_ENV=development.
  if (!isProd) {
    app.get('/auth/dev-login', async (request, reply) => {
      const first = await db.query.users.findFirst({
        orderBy: (u, { asc }) => [asc(u.id)],
      });
      if (!first) {
        return reply.code(404).send({ error: 'no_users_in_db' });
      }
      setUserSession(request, first.id);
      return reply.send({ ok: true, username: first.username });
    });
  }
}
