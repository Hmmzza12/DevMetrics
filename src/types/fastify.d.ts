import type { OAuth2Namespace } from '@fastify/oauth2';
import type { User } from '../db/schema.ts';

declare module 'fastify' {
  interface FastifyInstance {
    githubOAuth2: OAuth2Namespace;
  }
  interface FastifyRequest {
    /** Populated by the `requireAuth` preHandler. */
    userId?: number;
    user?: User;
  }
}

declare module '@fastify/secure-session' {
  interface SessionData {
    userId: number;
  }
}
