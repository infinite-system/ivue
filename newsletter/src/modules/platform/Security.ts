import { Static } from 'ivue/extras';

// Secret comparison and unsubscribe-link signing. Every credential check
// in the Worker flows through the one timing-safe comparison here.
class $Security {
  // Compare secrets without a timing side-channel: hash both to fixed
  // size (no length leak), then constant-time compare.
  static async timingSafeEqualStrings(
    provided: string,
    expected: string,
  ): Promise<boolean> {
    const encoder = new TextEncoder();
    const [providedHash, expectedHash] = await Promise.all([
      crypto.subtle.digest('SHA-256', encoder.encode(provided)),
      crypto.subtle.digest('SHA-256', encoder.encode(expected)),
    ]);
    return crypto.subtle.timingSafeEqual(providedHash, expectedHash);
  }

  // Bearer ADMIN_SECRET — /broadcast, /drip, and the whole /admin surface.
  static async bearerAuthorized(request: Request, env: Env): Promise<boolean> {
    const authorization = request.headers.get('authorization') ?? '';
    return this.timingSafeEqualStrings(
      authorization,
      `Bearer ${env.ADMIN_SECRET}`,
    );
  }

  // Basic postmark:ADMIN_SECRET — the Postmark webhook's credential.
  static async basicAuthorized(request: Request, env: Env): Promise<boolean> {
    const authorization = request.headers.get('authorization') ?? '';
    return this.timingSafeEqualStrings(
      authorization,
      `Basic ${btoa(`postmark:${env.ADMIN_SECRET}`)}`,
    );
  }

  static async unsubscribeToken(address: string, env: Env): Promise<string> {
    return this.signature(address, env);
  }

  static async unsubscribeUrl(address: string, env: Env): Promise<string> {
    const token = await this.unsubscribeToken(address, env);
    return `${env.WORKER_ORIGIN}/unsubscribe?email=${encodeURIComponent(address)}&token=${token}`;
  }

  // HMAC over an arbitrary message with the same key — the general form
  // the two comment-thread tokens below are built from.
  static async signature(message: string, env: Env): Promise<string> {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(env.ADMIN_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signed = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(message),
    );
    return [...new Uint8Array(signed)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  // Per-(thread, address) token: proves an unsubscribe link came from
  // an email we sent, without a session or an account.
  static async threadToken(
    rootId: number,
    address: string,
    env: Env,
  ): Promise<string> {
    return this.signature(
      `comment-thread:${rootId}:${address.trim().toLowerCase()}`,
      env,
    );
  }

  // A stable, non-reversible handle for one commenter: it drives the
  // identicon on the site, so the same person keeps the same avatar
  // across posts while the address itself never leaves the Worker.
  // This is a DISPLAY value, not a credential — without a configured
  // secret (local dev) it degrades to a plain digest rather than
  // failing a comment submission.
  static async avatarSeed(address: string, env: Env): Promise<string> {
    const message = `avatar:${address.trim().toLowerCase()}`;
    const digest = env.ADMIN_SECRET
      ? await this.signature(message, env)
      : await this.sha256Hex(message);
    return digest.slice(0, 16);
  }

  static async sha256Hex(message: string): Promise<string> {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(message),
    );
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}

export namespace Security {
  export const $Class = Static($Security);
  export let Class = $Class;
}
