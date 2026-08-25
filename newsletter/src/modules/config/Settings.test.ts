/*
=== GENERATOR ===
Goal: Prove operator settings layer D1 overrides on env defaults and refuse any value the drip clock cannot run.
// domain-invariant: $Settings — If no override is stored, then the env drip clock rules
Impossible if true: an out-of-range cadence or send hour is accepted

=== GENERATOR-DESCRIBED ===
A fresh database behaves exactly like wrangler.jsonc, so the dashboard can retune $Settings without a deploy; corruption falls back instead of wedging the cron.
*/
import { describe, expect, it } from 'vitest';
import { Settings } from './Settings';
import { makeTestEnv } from '../../../test/TestDatabase';

describe('Settings', () => {
  // domain-invariant: $Settings — If no override is stored, then the env drip clock rules
  it('falls back to the env drip clock when nothing is stored', async () => {
    const env = makeTestEnv();
    expect(await Settings.Class.dripSchedule(env)).toEqual({
      cadenceDays: 2,
      sendHourLocal: 9,
      defaultTimezone: 'America/Toronto',
    });
  });

  it('stored values override the env vars', async () => {
    const env = makeTestEnv();
    await Settings.Class.setCadenceDays(env, 3);
    await Settings.Class.setSendHourLocal(env, 18);
    await Settings.Class.setDefaultTimezone(env, 'Europe/Berlin');
    expect(await Settings.Class.dripSchedule(env)).toEqual({
      cadenceDays: 3,
      sendHourLocal: 18,
      defaultTimezone: 'Europe/Berlin',
    });
  });

  // impossible-if-true: $Settings — an out-of-range cadence or send hour is accepted
  it('rejects out-of-range cadence, hour, and invalid timezones', async () => {
    const env = makeTestEnv();
    await expect(Settings.Class.setCadenceDays(env, 0)).rejects.toThrow();
    await expect(Settings.Class.setCadenceDays(env, 31)).rejects.toThrow();
    await expect(Settings.Class.setCadenceDays(env, 1.5)).rejects.toThrow();
    await expect(Settings.Class.setSendHourLocal(env, -1)).rejects.toThrow();
    await expect(Settings.Class.setSendHourLocal(env, 24)).rejects.toThrow();
    await expect(
      Settings.Class.setDefaultTimezone(env, 'Not/AZone'),
    ).rejects.toThrow();
  });

  it('a corrupted stored value falls back to the env drip clock', async () => {
    const env = makeTestEnv();
    await Settings.Class.write(env, Settings.Class.CADENCE_DAYS_KEY, 'junk');
    await Settings.Class.write(env, Settings.Class.SEND_HOUR_KEY, '99');
    await Settings.Class.write(
      env,
      Settings.Class.DEFAULT_TIMEZONE_KEY,
      'Broken/Zone',
    );
    expect(await Settings.Class.dripSchedule(env)).toEqual({
      cadenceDays: 2,
      sendHourLocal: 9,
      defaultTimezone: 'America/Toronto',
    });
  });

  it('per-list overrides layer over the defaults and clear back to inherit', async () => {
    const env = makeTestEnv();
    await Settings.Class.setListSchedule(env, 'vip', {
      cadenceDays: 1,
      sendHourLocal: 18,
    });
    expect(await Settings.Class.dripScheduleForList(env, 'vip')).toEqual({
      cadenceDays: 1,
      sendHourLocal: 18,
      defaultTimezone: 'America/Toronto',
    });
    // an un-overridden list inherits the defaults untouched
    expect(await Settings.Class.dripScheduleForList(env, 'newsletter')).toEqual(
      {
        cadenceDays: 2,
        sendHourLocal: 9,
        defaultTimezone: 'America/Toronto',
      },
    );
    // partial override: only the hour, cadence inherited
    await Settings.Class.setListSchedule(env, 'digest', {
      sendHourLocal: 7,
    });
    expect(await Settings.Class.dripScheduleForList(env, 'digest')).toEqual({
      cadenceDays: 2,
      sendHourLocal: 7,
      defaultTimezone: 'America/Toronto',
    });
    // clearing reverts to inherit
    await Settings.Class.setListSchedule(env, 'vip', {
      cadenceDays: null,
      sendHourLocal: null,
    });
    expect(await Settings.Class.listOverrides(env)).toEqual({
      digest: { sendHourLocal: 7 },
    });
    await expect(
      Settings.Class.setListSchedule(env, 'vip', { cadenceDays: 99 }),
    ).rejects.toThrow();
  });
});
