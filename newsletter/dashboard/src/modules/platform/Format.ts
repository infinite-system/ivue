import { Static } from 'ivue/extras';

// Presentation formatting — unix seconds and counts, one way everywhere.
class $Format {
  static date(unixSeconds: number | null): string {
    if (!unixSeconds) return '—';
    return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  static dateTime(unixSeconds: number | null): string {
    if (!unixSeconds) return '—';
    return new Date(unixSeconds * 1000).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  static orDash(text: string | null | undefined): string {
    return text || '—';
  }

  // a datetime-local input value ("YYYY-MM-DDTHH:mm", browser-local) as
  // unix seconds; null when empty or unparsable
  static epochFromLocalInput(value: string): number | null {
    if (!value) return null;
    const milliseconds = new Date(value).getTime();
    return Number.isFinite(milliseconds)
      ? Math.floor(milliseconds / 1000)
      : null;
  }

  static relativeDue(unixSeconds: number, now = Date.now() / 1000): string {
    const deltaSeconds = unixSeconds - now;
    if (deltaSeconds <= 0) return 'now';
    const hours = Math.round(deltaSeconds / 3600);
    if (hours < 48) return `in ~${hours}h`;
    return `in ~${Math.round(hours / 24)}d`;
  }
}

export namespace Format {
  export const $Class = Static($Format);
  export let Class = $Class;
}
