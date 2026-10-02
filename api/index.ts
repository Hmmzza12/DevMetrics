import type { InjectOptions, LightMyRequestResponse } from 'fastify';
import { buildServer } from '../src/server.ts';

export const maxDuration = 300;

const appPromise = buildServer().then(async (app) => {
  await app.ready();
  return app;
});

export default {
  async fetch(request: Request): Promise<Response> {
    const app = await appPromise;
    const url = new URL(request.url);
    const method = request.method as InjectOptions['method'];
    const payload =
      method === 'GET' || method === 'HEAD'
        ? undefined
        : Buffer.from(await request.arrayBuffer());

    const result: LightMyRequestResponse = await app.inject({
      method,
      url: `${url.pathname}${url.search}`,
      headers: Object.fromEntries(request.headers.entries()),
      payload,
    });

    const headers = new Headers();
    for (const [key, value] of Object.entries(result.headers)) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        for (const item of value) headers.append(key, String(item));
      } else {
        headers.set(key, String(value));
      }
    }

    return new Response(result.rawPayload, {
      status: result.statusCode,
      headers,
    });
  },
};
