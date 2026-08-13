import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { env } from '../config/env.ts';
import * as schema from './schema.ts';

/**
 * Shared libSQL/Turso connection + Drizzle instance.
 *
 * A single client is created per process. Both the Fastify server and the
 * sync worker_thread import this module, so each gets its own connection —
 * which is exactly what we want (workers run in isolated threads).
 */
export const libsql = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN || undefined,
});

export const db = drizzle(libsql, { schema });

export type DB = typeof db;
export { schema };
