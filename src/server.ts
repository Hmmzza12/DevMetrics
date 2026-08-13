import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import oauth2 from '@fastify/oauth2';
import rateLimit from '@fastify/rate-limit';
import secureSession from '@fastify/secure-session';
import Fastify from 'fastify';
import { env, isProd } from './config/env.ts';
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  sessionKey,
} from './lib/session.ts';
import { apiRoutes } from './routes/api.ts';
import { authRoutes } from './routes/auth.ts';
import { publicRoutes } from './routes/public.ts';

export async function buildServer() {
  const app = Fastify({
    // Trust the proxy in production so per-IP rate limiting sees the real client
    // IP (Railway/Netlify sit in front). Locally this is a no-op.
    trustProxy: isProd,
    logger: {
      level: isProd ? 'info' : 'debug',
      transport: isProd
        ? undefined
        : { target: 'pino-pretty', options: { colorize: true } },
    },
  });

  // Per-IP rate limiting. Registered with `global: false` so it applies ONLY to
  // routes that opt in via `config.rateLimit` (the public sync trigger). Cached
  // reads and status checks are never counted.
  await app.register(rateLimit, { global: false });

  // CORS — allow only the frontend origin, with credentials (cookies).
  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Cookies (also used by @fastify/oauth2 for its state cookie).
  await app.register(cookie);

  // Encrypted, httpOnly session cookie carrying just the user id.
  await app.register(secureSession, {
    key: sessionKey,
    cookieName: SESSION_COOKIE_NAME,
    cookie: sessionCookieOptions,
  });

  // GitHub OAuth2 — registers `GET /auth/github` (start) automatically.
  await app.register(oauth2, {
    name: 'githubOAuth2',
    scope: ['read:user', 'repo'],
    credentials: {
      client: {
        id: env.GITHUB_CLIENT_ID,
        secret: env.GITHUB_CLIENT_SECRET,
      },
      auth: oauth2.GITHUB_CONFIGURATION,
    },
    startRedirectPath: '/auth/github',
    callbackUri: env.GITHUB_CALLBACK_URL,
    cookie: {
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    },
  });

  // Health check.
  app.get('/health', async () => ({ status: 'ok' }));

  // Route groups.
  await app.register(authRoutes);
  await app.register(apiRoutes);
  await app.register(publicRoutes);

  return app;
}

async function main() {
  const app = await buildServer();
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Run only when executed directly (not when imported, e.g. by tests).
const isMain =
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
if (isMain) {
  void main();
}
