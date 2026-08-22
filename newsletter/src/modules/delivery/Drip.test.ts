import { afterEach, describe, expect, it, vi } from 'vitest';
import { Drip } from './Drip';
import { Settings } from '../config/Settings';
import { LocalTime } from '../platform/LocalTime';
import { Audience } from '../audience/Audience';
import { Ledger } from '../audience/Ledger';
import { makeTestEnv } from '../../../test/TestDatabase';
import { installFetchStub, makePost } from '../../../test/Fixtures';

// Deterministic clock: schedule in UTC unless a test is explicitly
// about timezones. 2026-01-05 is a Monday.
const UTC_SCHEDULE = {
  cadenceDays: 2,
  sendHourLocal: 9,
  defaultTimezone: 'UTC',
};
const JAN_5_9AM_UTC = Date.UTC(2026, 0, 5, 9) / 1000;
const DAY_SECONDS = 86_400;

describe('Drip.plan (the pure decision the cron and the preview share)', () => {
  const posts = [makePost('first-post', 1), makePost('second-post', 2)];

  it('a brand-new subscriber is due at the send hour, held outside it', () => {
    const atNine = Drip.Class.plan(
      posts,
      [{ email: 'a@ivue.dev', name: 'Ada' }],
      [],
      UTC_SCHEDULE,
      JAN_5_9AM_UTC,
    );
    expect(atNine[0].nextSlug).toBe('first-post');
    expect(atNine[0].sendNow).toBe(true);
    expect(atNine[0].dueAt).toBe(JAN_5_9AM_UTC);

    const atTen = Drip.Class.plan(
      posts,
      [{ email: 'a@ivue.dev', name: 'Ada' }],
      [],
      UTC_SCHEDULE,
      JAN_5_9AM_UTC + 3600,
    );
    expect(atTen[0].sendNow).toBe(false);
    // next slot: tomorrow, same hour
    expect(atTen[0].dueAt).toBe(JAN_5_9AM_UTC + DAY_SECONDS);
  });

  it('the calendar-day gate holds until cadenceDays local days passed', () => {
    const sentMonday = [
      { email: 'a@ivue.dev', slug: 'first-post', sentAt: JAN_5_9AM_UTC },
    ];
    const tuesday = Drip.Class.plan(
      posts,
      [{ email: 'a@ivue.dev', name: 'Ada' }],
      sentMonday,
      UTC_SCHEDULE,
      JAN_5_9AM_UTC + DAY_SECONDS,
    );
    expect(tuesday[0].sendNow).toBe(false); // 1 day < cadence 2
    expect(tuesday[0].dueAt).toBe(JAN_5_9AM_UTC + 2 * DAY_SECONDS);

    const wednesday = Drip.Class.plan(
      posts,
      [{ email: 'a@ivue.dev', name: 'Ada' }],
      sentMonday,
      UTC_SCHEDULE,
      JAN_5_9AM_UTC + 2 * DAY_SECONDS,
    );
    expect(wednesday[0].nextSlug).toBe('second-post');
    expect(wednesday[0].sendNow).toBe(true);
  });

  it('a late send never drifts the schedule — the gate is calendar days, not hours', () => {
    // Monday's email went out late (11am); Wednesday 9am is STILL due:
    // two local calendar days have passed even though only 46 hours did
    const sentMondayLate = [
      {
        email: 'a@ivue.dev',
        slug: 'first-post',
        sentAt: JAN_5_9AM_UTC + 2 * 3600,
      },
    ];
    const wednesdayNine = Drip.Class.plan(
      posts,
      [{ email: 'a@ivue.dev', name: 'Ada' }],
      sentMondayLate,
      UTC_SCHEDULE,
      JAN_5_9AM_UTC + 2 * DAY_SECONDS,
    );
    expect(wednesdayNine[0].sendNow).toBe(true);
  });

  it('each subscriber is judged in their OWN timezone', () => {
    // 2026-01-05T00:00:00Z = 9am in Tokyo (UTC+9), 7pm Sunday in Toronto
    const midnightUTC = Date.UTC(2026, 0, 5, 0) / 1000;
    const entries = Drip.Class.plan(
      posts,
      [
        { email: 'tokyo@ivue.dev', name: '', timezone: 'Asia/Tokyo' },
        { email: 'unknown@ivue.dev', name: '', timezone: null },
      ],
      [],
      { ...UTC_SCHEDULE, defaultTimezone: 'America/Toronto' },
      midnightUTC,
    );
    const tokyo = entries.find((entry) => entry.email === 'tokyo@ivue.dev');
    const unknown = entries.find(
      (entry) => entry.email === 'unknown@ivue.dev',
    );
    expect(tokyo?.timezone).toBe('Asia/Tokyo');
    expect(tokyo?.sendNow).toBe(true);
    expect(unknown?.timezone).toBe('America/Toronto');
    expect(unknown?.sendNow).toBe(false);
    // the default-zone subscriber's slot is 9am Toronto that Monday
    expect(LocalTime.Class.hourAt(unknown!.dueAt, 'America/Toronto')).toBe(9);
  });

  it('a fully caught-up subscriber has nothing to receive', () => {
    const entries = Drip.Class.plan(
      posts,
      [{ email: 'a@ivue.dev', name: 'Ada' }],
      [
        { email: 'a@ivue.dev', slug: 'first-post', sentAt: 1 },
        { email: 'a@ivue.dev', slug: 'second-post', sentAt: 2 },
      ],
      UTC_SCHEDULE,
      JAN_5_9AM_UTC,
    );
    expect(entries[0].nextSlug).toBeNull();
    expect(entries[0].sendNow).toBe(false);
  });

  it('a broadcast that jumped the queue is never re-sent — the drip skips it', () => {
    const entries = Drip.Class.plan(
      posts,
      [{ email: 'a@ivue.dev', name: 'Ada' }],
      // second-post arrived via broadcast long ago; first-post still owed
      [{ email: 'a@ivue.dev', slug: 'second-post', sentAt: 10 }],
      UTC_SCHEDULE,
      JAN_5_9AM_UTC,
    );
    expect(entries[0].nextSlug).toBe('first-post');
    expect(entries[0].sendNow).toBe(true);
  });
});

describe('Drip.run (full pass over real tables and stubbed transports)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // run() reads the real clock, so these tests pin the schedule to
  // "this very hour, in UTC" through the settings table.
  async function pinScheduleToNow(env: Env) {
    await Settings.Class.setDefaultTimezone(env, 'UTC');
    await Settings.Class.setSendHourLocal(
      env,
      new Date().getUTCHours(),
    );
  }

  it('delivers each due subscriber their oldest unsent post, grouped by slug', async () => {
    const env = makeTestEnv();
    await pinScheduleToNow(env);
    await Audience.Class.enroll(env, 'new@ivue.dev', 'New', 'newsletter');
    await Audience.Class.enroll(env, 'mid@ivue.dev', 'Mid', 'newsletter');
    await Ledger.Class.record(env, [
      { email: 'mid@ivue.dev', slug: 'first-post', sentAt: 1 }, // long ago
    ]);
    const postmarkCalls = installFetchStub({
      posts: [makePost('first-post', 1), makePost('second-post', 2)],
    });

    const delivered = await Drip.Class.run(env);
    expect(delivered).toBe(2);
    const recipientsBySubject = postmarkCalls.flatMap((call) =>
      call.messages.map((message) => `${message.Subject} -> ${message.To}`),
    );
    expect(recipientsBySubject.sort()).toEqual([
      'Title of first-post -> new@ivue.dev',
      'Title of second-post -> mid@ivue.dev',
    ]);
  });

  it('a second immediate pass sends nothing (calendar gate + ledger)', async () => {
    const env = makeTestEnv();
    await pinScheduleToNow(env);
    await Audience.Class.enroll(env, 'a@ivue.dev', 'Ada', 'newsletter');
    installFetchStub({ posts: [makePost('first-post', 1)] });
    expect(await Drip.Class.run(env)).toBe(1);
    expect(await Drip.Class.run(env)).toBe(0);
  });

  it('outside the send hour, nobody is due', async () => {
    const env = makeTestEnv();
    await Settings.Class.setDefaultTimezone(env, 'UTC');
    await Settings.Class.setSendHourLocal(
      env,
      (new Date().getUTCHours() + 12) % 24,
    );
    await Audience.Class.enroll(env, 'a@ivue.dev', 'Ada', 'newsletter');
    installFetchStub({ posts: [makePost('first-post', 1)] });
    expect(await Drip.Class.run(env)).toBe(0);
  });
});
