import { describe, expect, it } from 'vitest';
import { Http } from './Http';
import { makeTestEnv } from '../../../test/TestDatabase';

describe('Http', () => {
  it('json sets status and content type', async () => {
    const response = Http.Class.json({ ok: true }, 201);
    expect(response.status).toBe(201);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(await response.json()).toEqual({ ok: true });
  });

  it('withCors grants the SITE origin only', () => {
    const response = Http.Class.withCors(Http.Class.json({}), makeTestEnv());
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'https://ivue.dev',
    );
  });

  it('readJsonBody returns an empty object on malformed JSON', async () => {
    const request = new Request('https://newsletter.test/subscribe', {
      method: 'POST',
      body: 'not json',
    });
    expect(await Http.Class.readJsonBody(request)).toEqual({});
  });

  it('html and notFound carry their content types and statuses', async () => {
    expect(Http.Class.html('<p>hi</p>').headers.get('content-type')).toBe(
      'text/html; charset=utf-8',
    );
    expect(Http.Class.notFound().status).toBe(404);
  });
});
