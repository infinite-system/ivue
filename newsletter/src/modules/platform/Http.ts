import { Static } from 'ivue/extras';

// Response construction for every endpoint — one place decides headers,
// CORS reach, and error shape.
class $Http {
  static json(payload: unknown, status = 200): Response {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }

  static html(markup: string, status = 200): Response {
    return new Response(markup, {
      status,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  static notFound(): Response {
    return new Response('Not found', { status: 404 });
  }

  // CORS is granted to the SITE origin only — the public subscribe form.
  // The admin dashboard is same-origin (served by this Worker's assets)
  // or proxied server-side by the local dev server, so /admin/* never
  // needs a CORS grant.
  static withCors(response: Response, env: Env): Response {
    response.headers.set('access-control-allow-origin', env.SITE_ORIGIN);
    response.headers.set('access-control-allow-methods', 'POST, OPTIONS');
    response.headers.set('access-control-allow-headers', 'content-type');
    return response;
  }

  static async readJsonBody<Body extends object>(
    request: Request,
  ): Promise<Partial<Body>> {
    return (await request.json().catch(() => ({}))) as Partial<Body>;
  }

  static nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }
}

export namespace Http {
  export const $Class = Static($Http);
  export let Class = $Class;
}
