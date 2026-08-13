import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type {
  FastifyReply,
  FastifyRequest,
  preHandlerHookHandler,
} from 'fastify';
import { env, isProd } from '../config/env.ts';
import { db } from '../db/client.ts';
import { users } from '../db/schema.ts';

/**
 * Session config for @fastify/secure-session.
 *
 * The session payload (just the user id) is AES-encrypted inside an httpOnly
 * cookie — stateless, survives restarts, and the raw access token never leaves
 * the database. In production the cookie is cross-site (Netlify → Railway), so
 * SameSite=None; Secure is required.
 */
export const SESSION_COOKIE_NAME = 'devmetrics_session';

// Distinct 32-byte key for the session cookie (kept separate from the token key).
export const sessionKey = createHash('sha256')
  .update(`devmetrics-session:${env.SESSION_SECRET}`)
  .digest();

export const sessionCookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  secure: isProd,
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

export function setUserSession(request: FastifyRequest, userId: number): void {
  request.session.set('userId', userId);
}

export function clearUserSession(request: FastifyRequest): void {
  request.session.delete();
}

export function getSessionUserId(request: FastifyRequest): number | undefined {
  return request.session.get('userId');
}

/**
 * preHandler that requires a valid session. Loads the user, attaches it as
 * `request.user` / `request.userId`, and replies 401 otherwise.
 */
export const requireAuth: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const userId = getSessionUserId(request);
  if (!userId) {
    return reply.code(401).send({ error: 'unauthorized' });
  }
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  // A public-lookup profile (flagged, tokenless) can never be an authenticated
  // session — reject even if a session cookie somehow references its id.
  if (!user || user.isPublicLookup || !user.accessToken) {
    clearUserSession(request);
    return reply.code(401).send({ error: 'unauthorized' });
  }
  request.userId = user.id;
  request.user = user;
};
