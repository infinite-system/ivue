import { describe, expect, it } from 'vitest';
import { LocalTime } from './LocalTime';

describe('LocalTime', () => {
  it('reads the local hour in a zone, DST included', () => {
    // 2026-01-05T14:00:00Z = 9am in Toronto (EST, UTC-5)
    const winter = Date.UTC(2026, 0, 5, 14) / 1000;
    expect(LocalTime.Class.hourAt(winter, 'America/Toronto')).toBe(9);
    // 2026-07-06T13:00:00Z = 9am in Toronto (EDT, UTC-4)
    const summer = Date.UTC(2026, 6, 6, 13) / 1000;
    expect(LocalTime.Class.hourAt(summer, 'America/Toronto')).toBe(9);
    expect(LocalTime.Class.hourAt(winter, 'UTC')).toBe(14);
    expect(LocalTime.Class.hourAt(winter, 'Asia/Tokyo')).toBe(23);
  });

  it('day numbers advance with the LOCAL calendar, not UTC', () => {
    // 2026-01-05T03:00:00Z is still Jan 4 in Toronto (10pm EST)
    const lateNight = Date.UTC(2026, 0, 5, 3) / 1000;
    expect(
      LocalTime.Class.dayNumberAt(lateNight, 'UTC') -
        LocalTime.Class.dayNumberAt(lateNight, 'America/Toronto'),
    ).toBe(1);
    // one local midnight apart = exactly one day number apart
    const monday = Date.UTC(2026, 0, 5, 14) / 1000;
    const tuesday = monday + 86_400;
    expect(
      LocalTime.Class.dayNumberAt(tuesday, 'America/Toronto') -
        LocalTime.Class.dayNumberAt(monday, 'America/Toronto'),
    ).toBe(1);
  });

  it('normalizeTimezone accepts IANA zones and rejects junk', () => {
    expect(LocalTime.Class.normalizeTimezone('America/Toronto')).toBe(
      'America/Toronto',
    );
    expect(LocalTime.Class.normalizeTimezone(' Europe/Berlin ')).toBe(
      'Europe/Berlin',
    );
    expect(LocalTime.Class.normalizeTimezone('Not/AZone')).toBe('');
    expect(LocalTime.Class.normalizeTimezone('')).toBe('');
    expect(LocalTime.Class.normalizeTimezone(null)).toBe('');
    expect(LocalTime.Class.normalizeTimezone(42)).toBe('');
  });
});
