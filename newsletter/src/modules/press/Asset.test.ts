/*
=== GENERATOR ===
Goal: Prove a dropped image or video lands in the bucket under a unique readable key, comes back publicly with its type and a long cache, and that anything else — a wrong type, an empty or oversized body, a malformed key — is refused.
// domain-invariant: $Asset — If a file is stored, then its public URL serves it with the content type it was stored with
// domain-invariant: $Asset — If two files share a name, then they get two keys and neither overwrites the other
Impossible if true: a key that is not a timestamp, a slug and an extension is served

=== GENERATOR-DESCRIBED ===
$Asset is the press's R2 store: uploads ride the admin secret, reads are open, keys are never reused.
*/
import { describe, expect, it } from 'vitest';
import { Asset } from './Asset';
import { AdminApi } from '../api/AdminApi';
import { makeTestEnv } from '../../../test/TestDatabase';

const SECRET = 'press-secret';
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer;

describe('Asset', () => {
  // domain-invariant: $Asset — If a file is stored, then its public URL serves it with the content type it was stored with
  // domain-invariant: $Asset — If two files share a name, then they get two keys and neither overwrites the other
  it('stores under a readable unique key and serves it back publicly with its type', async () => {
    const env = makeTestEnv();
    const first = await Asset.Class.put(env, { name: 'My Banner (final).PNG', contentType: 'image/png', body: PNG });
    expect(first.key).toMatch(/^\d+-[a-z0-9]{4}-my-banner-final\.png$/);
    expect(first.url).toBe(`https://newsletter.test/press-asset/${first.key}`);
    expect(first.size).toBe(8);
    const second = await Asset.Class.put(env, { name: 'My Banner (final).PNG', contentType: 'image/png', body: PNG });
    expect(second.key).not.toBe(first.key);
    const served = await Asset.Class.serve(env, first.key);
    expect(served.status).toBe(200);
    expect(served.headers.get('content-type')).toBe('image/png');
    expect(served.headers.get('cache-control')).toContain('immutable');
    expect(new Uint8Array(await served.arrayBuffer())).toEqual(new Uint8Array(PNG));
    await Asset.Class.remove(env, first.key);
    expect((await Asset.Class.serve(env, first.key)).status).toBe(404);
  });

  // impossible-if-true: $Asset — a key that is not a timestamp, a slug and an extension is served
  it('refuses the wrong type, an empty body, an oversized body, and a malformed key', async () => {
    const env = makeTestEnv();
    await expect(Asset.Class.put(env, { name: 'x', contentType: 'text/html', body: PNG })).rejects.toThrow(/Not an image or video/);
    await expect(Asset.Class.put(env, { name: 'x', contentType: 'image/png', body: new ArrayBuffer(0) })).rejects.toThrow(/empty/);
    await expect(
      Asset.Class.put(env, { name: 'x', contentType: 'image/png', body: new ArrayBuffer(Asset.Class.MAXIMUM_BYTES + 1) }),
    ).rejects.toThrow(/Too large/);
    expect((await Asset.Class.serve(env, '../secrets')).status).toBe(404);
    expect((await Asset.Class.serve(env, 'nope.png')).status).toBe(404);
    expect(Asset.Class.keyFor('', 'image/webp', 5, 'ab12')).toBe('5-ab12-asset.webp');
    expect(Asset.Class.token()).toMatch(/^[a-z0-9]{4}$/);
    await expect(Asset.Class.put(env, { name: 'x', contentType: '', body: PNG })).rejects.toThrow(/unknown type/);
    // an object written without metadata still serves, as bytes
    await env.PRESS_ASSETS.put('7-ab12-raw.bin', PNG);
    expect((await Asset.Class.serve(env, '7-ab12-raw.bin')).headers.get('content-type')).toBe('application/octet-stream');
  });

  it('uploads through the admin route with the name in the query and the type in the header', async () => {
    const env = makeTestEnv({ ADMIN_SECRET: SECRET });
    const request = new Request('https://newsletter.test/admin/press/asset?name=drop.png', {
      method: 'POST',
      headers: { authorization: `Bearer ${SECRET}`, 'content-type': 'image/png; charset=binary' },
      body: PNG,
    });
    const response = await AdminApi.Class.handle(request, new URL(request.url), env);
    expect(response.status).toBe(200);
    const stored = (await response.json()) as Asset.Stored;
    expect(stored.key).toMatch(/-drop\.png$/);
    expect((await Asset.Class.serve(env, stored.key)).status).toBe(200);
    const bad = new Request('https://newsletter.test/admin/press/asset', {
      method: 'POST',
      headers: { authorization: `Bearer ${SECRET}` },
      body: 'text',
    });
    expect((await AdminApi.Class.handle(bad, new URL(bad.url), env)).status).toBe(400);
    const empty = new Request('https://newsletter.test/admin/press/asset', {
      method: 'POST',
      headers: { authorization: `Bearer ${SECRET}` },
    });
    expect((await AdminApi.Class.handle(empty, new URL(empty.url), env)).status).toBe(400);
  });
});
