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
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(env.ADMIN_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(address),
    );
    return [...new Uint8Array(signature)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  static async unsubscribeUrl(address: string, env: Env): Promise<string> {
    const token = await this.unsubscribeToken(address, env);
    return `${env.WORKER_ORIGIN}/unsubscribe?email=${encodeURIComponent(address)}&token=${token}`;
  }
}

export namespace Security {
  export const $Class = Static($Security);
  export let Class = $Class;
}
