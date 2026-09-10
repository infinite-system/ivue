import { Static } from 'ivue/extras';
import { Http } from '../platform/Http';

// The press's asset store — images and video dropped into the editors,
// kept in R2 and served publicly under /press-asset/<key> so the cards,
// the previews and the X poster all read the same URL. Uploads ride the
// admin secret; reads are open and cached for a year, since a key carries
// its upload time plus a token and is never overwritten.
class $Asset {
  static readonly PUBLIC_PATH = '/press-asset/';
  static readonly MAXIMUM_BYTES = 25 * 1024 * 1024;
  static readonly TYPES: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/svg+xml': 'svg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  };

  static isAllowed(contentType: string): boolean {
    return contentType in this.TYPES;
  }

  /** four base-36 characters: two uploads in the same millisecond still get two keys */
  static token(): string {
    return Math.floor(Math.random() * 36 ** 4)
      .toString(36)
      .padStart(4, '0');
  }

  /** `<unix ms>-<token>-<slug>.<extension>` — unique, readable, never overwritten */
  static keyFor(name: string, contentType: string, now = Date.now(), token = this.token()): string {
    const extension = this.TYPES[contentType];
    const stem = name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    return `${now}-${token}-${stem || 'asset'}.${extension}`;
  }

  static publicUrl(env: Env, key: string): string {
    return `${env.WORKER_ORIGIN}${this.PUBLIC_PATH}${key}`;
  }

  static async put(
    env: Env,
    upload: { name: string; contentType: string; body: ArrayBuffer },
  ): Promise<Asset.Stored> {
    if (!this.isAllowed(upload.contentType))
      throw new Error(`Not an image or video we host: ${upload.contentType || 'unknown type'}`);
    if (upload.body.byteLength === 0) throw new Error('The file is empty.');
    if (upload.body.byteLength > this.MAXIMUM_BYTES)
      throw new Error(`Too large — the limit is ${this.MAXIMUM_BYTES / 1024 / 1024} MB.`);
    const key = this.keyFor(upload.name, upload.contentType);
    await env.PRESS_ASSETS.put(key, upload.body, {
      httpMetadata: { contentType: upload.contentType, cacheControl: 'public, max-age=31536000, immutable' },
    });
    return {
      key,
      url: this.publicUrl(env, key),
      contentType: upload.contentType,
      size: upload.body.byteLength,
    };
  }

  /** the public read: the object with its type and a long cache, or 404 */
  static async serve(env: Env, key: string): Promise<Response> {
    if (!/^[0-9]+-[a-z0-9]{4}-[a-z0-9-]+\.[a-z0-9]+$/.test(key)) return Http.Class.notFound();
    const object = await env.PRESS_ASSETS.get(key);
    if (!object) return Http.Class.notFound();
    return new Response(object.body, {
      headers: {
        'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
        'cache-control': 'public, max-age=31536000, immutable',
        'access-control-allow-origin': '*',
      },
    });
  }

  static async remove(env: Env, key: string): Promise<void> {
    await env.PRESS_ASSETS.delete(key);
  }
}

export namespace Asset {
  export const $Class = Static($Asset);
  export let Class = $Class;

  export interface Stored {
    key: string;
    url: string;
    contentType: string;
    size: number;
  }
}
