import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { eq } from 'drizzle-orm';
import type {
  FastifyReply,
  FastifyRequest,
  preHandlerHookHandler,
} from 'fastify';
import { env, isProd } from '../config/env.js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';

/**
 * The session payload (just the user id and expiry) is AES-256-GCM encrypted
 * inside an httpOnly cookie. It is stateless, survives restarts, and avoids a
 * native crypto dependency so it works in both containers and Node functions.
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

const SESSION_TTL_MS = sessionCookieOptions.maxAge * 1000;

function encodeSession(userId: number): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sessionKey, iv);
  const plaintext = JSON.stringify({ userId, exp: Date.now() + SESSION_TTL_MS });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
    'base64url',
  );
}

function decodeSession(value: string): number | undefined {
  try {
    const payload = Buffer.from(value, 'base64url');
    if (payload.length < 29) return undefined;
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', sessionKey, iv);
    decipher.setAuthTag(tag);
    const decoded = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
    const data = JSON.parse(decoded) as { userId?: unknown; exp?: unknown };
    if (
      typeof data.userId !== 'number' ||
      !Number.isInteger(data.userId) ||
      typeof data.exp !== 'number' ||
      data.exp <= Date.now()
    ) {
      return undefined;
    }
    return data.userId;
  } catch {
    return undefined;
  }
}

export function setUserSession(reply: FastifyReply, userId: number): void {
  reply.setCookie(SESSION_COOKIE_NAME, encodeSession(userId), sessionCookieOptions);
}

export function clearUserSession(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
}

export function getSessionUserId(request: FastifyRequest): number | undefined {
  const value = request.cookies[SESSION_COOKIE_NAME];
  return value ? decodeSession(value) : undefined;
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
    clearUserSession(reply);
    return reply.code(401).send({ error: 'unauthorized' });
  }
  request.userId = user.id;
  request.user = user;
};
