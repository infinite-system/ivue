import { Static } from 'ivue/extras';

// Cloudflare Turnstile verification for the public subscribe form.
// Fails closed: any transport error, malformed token, or hostname/action
// mismatch counts as a bot.
class $Turnstile {
  static get SITEVERIFY_URL() {
    return 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  }

  static get EXPECTED_ACTION() {
    return 'newsletter';
  }

  static get MAXIMUM_TOKEN_LENGTH() {
    return 2048;
  }

  static async verify(
    token: string | undefined,
    clientIp: string | null,
    env: Env,
  ): Promise<boolean> {
    if (
      typeof token !== 'string' ||
      token.length === 0 ||
      token.length > this.MAXIMUM_TOKEN_LENGTH
    )
      return false;
    const expectedHostnames = new Set(
      (env.TURNSTILE_HOSTNAMES ?? '')
        .split(',')
        .map((hostname) => hostname.trim())
        .filter(Boolean),
    );
    if (expectedHostnames.size === 0) return false;
    try {
      const response = await fetch(this.SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(10_000),
        body: new URLSearchParams({
          // trim: a stray newline from `secret put` malforms the request
          secret: (env.TURNSTILE_SECRET ?? '').trim(),
          response: token.trim(),
          ...(clientIp ? { remoteip: clientIp } : {}),
        }),
      });
      if (!response.ok)
        throw new Error(
          `siteverify ${response.status}: ${(await response.text()).slice(0, 300)}`,
        );
      const result = (await response.json()) as {
        success: boolean;
        action?: string;
        hostname?: string;
        'error-codes'?: string[];
      };
      const verdict =
        result.success &&
        result.action === this.EXPECTED_ACTION &&
        expectedHostnames.has(result.hostname ?? '');
      if (!verdict) {
        console.error(
          JSON.stringify({
            event: 'turnstile_rejected',
            success: result.success,
            errorCodes: result['error-codes'] ?? [],
            action: result.action ?? null,
            hostname: result.hostname ?? null,
          }),
        );
      }
      return verdict;
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'turnstile_verify_failed',
          error: String(error),
        }),
      );
      return false; // fail closed
    }
  }
}

export namespace Turnstile {
  export const $Class = Static($Turnstile);
  export let Class = $Class;
}
