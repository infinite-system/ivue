import { Static } from 'ivue/extras';

// Which email variant does a recipient get? Gmail's mobile apps ignore
// color-scheme declarations and recolor a designed-dark email into a
// mangled light one, so recipients reading in a Gmail UI receive the
// LIGHT-chrome variant instead. Two signals say "Gmail UI":
//   1. the address itself — @gmail.com / @googlemail.com;
//   2. the domain's MX is Google-hosted (Workspace) — resolved once per
//      domain per Worker isolate through DNS-over-HTTPS (Workers cannot
//      open raw DNS sockets).
// Detection is best-effort: a DoH failure or timeout answers false, and
// the recipient gets the canonical dark email.
class $GmailUi {
  static get DOH_URL() {
    return 'https://cloudflare-dns.com/dns-query';
  }

  // per-isolate memo — a drip pass looks each distinct domain up once
  static domainCache = new Map<string, boolean>();

  static async usesGmailUi(email: string): Promise<boolean> {
    const domain = email.toLowerCase().split('@')[1] ?? '';
    if (!domain) return false;
    if (domain === 'gmail.com' || domain === 'googlemail.com') return true;
    const cached = this.domainCache.get(domain);
    if (cached !== undefined) return cached;
    const hosted = await this.hasGoogleMx(domain);
    this.domainCache.set(domain, hosted);
    return hosted;
  }

  // Google Workspace MX hosts all end in google.com or googlemail.com
  // (aspmx.l.google.com and friends).
  static async hasGoogleMx(domain: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.DOH_URL}?name=${encodeURIComponent(domain)}&type=MX`,
        { headers: { accept: 'application/dns-json' } },
      );
      if (!response.ok) return false;
      const answer = (await response.json()) as {
        Answer?: { type: number; data: string }[];
      };
      return (answer.Answer ?? []).some(
        (record) =>
          record.type === 15 &&
          /(^|\.)google(mail)?\.com\.?$/i.test(record.data.trim().split(/\s+/).pop() ?? ''),
      );
    } catch {
      return false;
    }
  }
}

export namespace GmailUi {
  export const $Class = Static($GmailUi);
  export let Class = $Class;
}
