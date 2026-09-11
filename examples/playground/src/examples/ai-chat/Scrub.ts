import { Static } from '../../Static';

// The one set of rules that keeps a session file publishable. The build
// script runs them over the shipped sample, and the page runs them again
// over a reader's own file before a character renders. Every rule is a
// replacement over text, so the same function covers a prompt, a tool
// input, a tool output and a thinking block alike.
class $Scrub {
  /** what a rule replaces its match with */
  static readonly RULES: Scrub.Rule[] = [
    {
      name: 'email',
      pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
      replacement: 'user@example.com'
    },
    {
      name: 'authorization-header',
      pattern: /(authorization\s*[:=]\s*)["']?[^"'\n,}]+/gi,
      replacement: '$1[redacted]'
    },
    {
      name: 'bearer',
      pattern: /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/g,
      replacement: '$1 [redacted]'
    },
    {
      name: 'api-key',
      pattern:
        /\b(?:sk-(?:ant-)?[A-Za-z0-9_-]{20,}|(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{16,}|gh[pousr]_[A-Za-z0-9]{30,}|xox[abp]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16})\b/g,
      replacement: '[redacted-key]'
    },
    {
      name: 'secret-assignment',
      pattern:
        /\b([A-Z][A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY)[A-Z0-9_]*)(\s*[:=]\s*["']?)(?!e2e-local-secret\b|process\.|env\.|import\.|\$)[A-Za-z0-9._~+/=-]{12,}/g,
      replacement: '$1$2[redacted]'
    },
    {
      name: 'pem-block',
      pattern: /-----BEGIN [^\n]*?-----[\s\S]*?(?:-----END [^\n]*?-----|$)/g,
      replacement: '[redacted PEM block]'
    },
    { name: 'pem-marker', pattern: /-----BEGIN\b/g, replacement: '-----REDACTED' },
    { name: 'bare-gmail', pattern: /@gmail\.com/gi, replacement: '@example.com' },
    { name: 'home-path', pattern: /\/(?:home|Users)\/[A-Za-z0-9._-]+/g, replacement: '~' },
    {
      name: 'lan-ip',
      pattern: /\b(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))(?:\.\d{1,3}){2,3}\b/g,
      replacement: '10.0.0.1'
    },
    {
      name: 'session-url',
      pattern: /https:\/\/claude\.ai\/code\/session_[A-Za-z0-9]+/g,
      replacement: 'https://claude.ai/code/session_[redacted]'
    }
  ];

  /** the strings that must never survive a scrub — the build fails on any of them */
  static readonly FORBIDDEN: RegExp[] = [
    /@gmail\.com/i,
    /\/home\/[a-z]/,
    /\bsk-[A-Za-z0-9]{16,}/,
    /Bearer\s+[A-Za-z0-9._-]{16,}/,
    /-----BEGIN/
  ];

  /** every rule over one string, counting what each rule replaced */
  static text(input: string, counts?: Scrub.Counts): string {
    let output = input;
    for (const rule of this.RULES) {
      output = output.replace(rule.pattern, (...match: unknown[]) => {
        if (counts) counts[rule.name] = (counts[rule.name] ?? 0) + 1;
        return rule.replacement.replace(/\$(\d)/g, (whole, group: string) =>
          String(match[Number(group)] ?? '')
        );
      });
    }
    return output;
  }

  /** the rules over every string inside a JSON value, in place shape, new value */
  static value<Value>(input: Value, counts?: Scrub.Counts): Value {
    if (typeof input === 'string') return this.text(input, counts) as unknown as Value;
    if (Array.isArray(input))
      return input.map((entry) => this.value(entry, counts)) as unknown as Value;
    if (input && typeof input === 'object') {
      const output: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(input as Record<string, unknown>))
        output[key] = this.value(entry, counts);
      return output as Value;
    }
    return input;
  }

  /** the forbidden strings that survive in a text, for the build's gate */
  static survivors(text: string): string[] {
    return this.FORBIDDEN.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
  }

  /**
   * Cut a long text in the middle, leaving both ends and a marker line
   * that states how much was removed. The ends are what a reader wants:
   * the command's first lines and the outcome's last.
   */
  static truncate(text: string, limit: number): string {
    if (text.length <= limit) return text;
    const keep = Math.floor(limit / 2);
    const removed = text.length - keep * 2;
    return `${text.slice(0, keep)}\n\n… [${removed.toLocaleString('en-US')} characters removed from the sample] …\n\n${text.slice(-keep)}`;
  }
}

export namespace Scrub {
  export const $Class = Static($Scrub);
  export let Class = $Class;

  export interface Rule {
    name: string;
    pattern: RegExp;
    replacement: string;
  }

  export type Counts = Record<string, number>;
}
