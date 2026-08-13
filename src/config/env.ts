import 'dotenv/config';
import { z } from 'zod';

/**
 * Centralised, validated environment configuration.
 *
 * Everything the app needs is read once, validated, and exported as a typed
 * object. Missing-but-required values fail fast at boot with a clear message
 * rather than surfacing as a confusing runtime error later.
 */

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),

  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  TURSO_DATABASE_URL: z.string().min(1, 'TURSO_DATABASE_URL is required'),
  TURSO_AUTH_TOKEN: z.string().optional().default(''),

  GITHUB_CLIENT_ID: z.string().min(1, 'GITHUB_CLIENT_ID is required'),
  GITHUB_CLIENT_SECRET: z.string().min(1, 'GITHUB_CLIENT_SECRET is required'),
  GITHUB_CALLBACK_URL: z
    .string()
    .url()
    .default('http://localhost:3000/auth/github/callback'),

  ANTHROPIC_API_KEY: z.string().optional().default(''),

  // Server-side GitHub PAT used for all *unauthenticated* public lookups.
  // Public read scope only (public_repo / read:user). 5000 req/hr vs 60 for
  // anonymous. Never exposed to the client. Optional so the app still boots
  // without public mode configured.
  GITHUB_PAT: z.string().optional().default(''),

  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters'),
  TOKEN_ENCRYPTION_KEY: z.string().optional().default(''),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  console.error(
    `\n✖ Invalid environment configuration:\n${issues}\n\n` +
      `Copy .env.example to .env and fill in the required values.\n`,
  );
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';

/**
 * How stale a user's data can be before we auto-trigger a background sync
 * on login. Spec: 6 hours.
 */
export const SYNC_STALE_MS = 6 * 60 * 60 * 1000;

/**
 * GraphQL rate-limit floor. If `rateLimit.remaining` drops below this, the
 * sync aborts gracefully rather than risk a hard 403 mid-run.
 */
export const RATE_LIMIT_FLOOR = 100;
