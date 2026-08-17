import { describe, expect, it } from 'vitest';
import { Audience } from './Audience';
import { Ledger } from './Ledger';
import { makeTestEnv } from '../../../test/TestDatabase';

describe('Audience', () => {
  it('enroll adds to a list and active excludes the suppressed', async () => {
    const env = makeTestEnv();
    await Audience.Class.enroll(env, 'a@ivue.dev', 'Ada', 'newsletter');
    await Audience.Class.enroll(env, 'b@ivue.dev', 'Bo', 'newsletter');
    await Audience.Class.suppress(env, 'b@ivue.dev');
    const active = await Audience.Class.active(env, 'newsletter');
    expect(active.map((subscriber) => subscriber.email)).toEqual([
      'a@ivue.dev',
    ]);
  });

  it('re-enrolling cancels a previous unsubscribe (sequence resumes)', async () => {
    const env = makeTestEnv();
    await Audience.Class.enroll(env, 'a@ivue.dev', 'Ada', 'newsletter');
    await Audience.Class.suppress(env, 'a@ivue.dev');
    await Audience.Class.enroll(env, 'a@ivue.dev', 'Ada', 'newsletter');
    const active = await Audience.Class.active(env, 'newsletter');
    expect(active).toHaveLength(1);
  });

  it('one email can belong to several lists; suppression is global', async () => {
    const env = makeTestEnv();
    await Audience.Class.enroll(env, 'a@ivue.dev', 'Ada', 'newsletter');
    await Audience.Class.enroll(env, 'a@ivue.dev', 'Ada', 'announcements');
    expect(await Audience.Class.active(env, 'announcements')).toHaveLength(1);
    await Audience.Class.suppress(env, 'a@ivue.dev');
    expect(await Audience.Class.active(env, 'newsletter')).toHaveLength(0);
    expect(await Audience.Class.active(env, 'announcements')).toHaveLength(0);
    const lists = await Audience.Class.lists(env);
    expect(lists).toEqual([
      { list: 'announcements', members: 1, active: 0 },
      { list: 'newsletter', members: 1, active: 0 },
    ]);
  });

  it('page aggregates send counts, filters by search, and paginates', async () => {
    const env = makeTestEnv();
    await Audience.Class.enroll(env, 'ada@ivue.dev', 'Ada', 'newsletter');
    await Audience.Class.enroll(env, 'bo@ivue.dev', 'Bo', 'newsletter');
    await Ledger.Class.record(env, [
      { email: 'ada@ivue.dev', slug: 'first-post', sentAt: 100 },
      { email: 'ada@ivue.dev', slug: 'second-post', sentAt: 200 },
    ]);
    const everyone = await Audience.Class.page(env, {});
    expect(everyone.total).toBe(2);
    const adaRow = everyone.rows.find((row) => row.email === 'ada@ivue.dev');
    expect(adaRow?.sendCount).toBe(2);
    expect(adaRow?.lastSentAt).toBe(200);
    expect(adaRow?.unsubscribedAt).toBeNull();

    const searched = await Audience.Class.page(env, { search: 'ada' });
    expect(searched.total).toBe(1);
    expect(searched.rows[0].email).toBe('ada@ivue.dev');

    const pageOne = await Audience.Class.page(env, { limit: 1, offset: 0 });
    const pageTwo = await Audience.Class.page(env, { limit: 1, offset: 1 });
    expect(pageOne.total).toBe(2);
    expect(pageOne.rows).toHaveLength(1);
    expect(pageTwo.rows).toHaveLength(1);
    expect(pageOne.rows[0].email).not.toBe(pageTwo.rows[0].email);
  });

  it('bulk suppress/unsuppress and remove with ledger purge', async () => {
    const env = makeTestEnv();
    await Audience.Class.enroll(env, 'a@ivue.dev', 'Ada', 'newsletter');
    await Audience.Class.enroll(env, 'b@ivue.dev', 'Bo', 'newsletter');
    await Audience.Class.suppressMany(env, ['a@ivue.dev', 'b@ivue.dev']);
    expect(await Audience.Class.active(env, 'newsletter')).toHaveLength(0);
    await Audience.Class.unsuppressMany(env, ['a@ivue.dev']);
    expect(await Audience.Class.active(env, 'newsletter')).toHaveLength(1);

    await Ledger.Class.record(env, [
      { email: 'a@ivue.dev', slug: 'first-post', sentAt: 100 },
    ]);
    await Audience.Class.removeMany(env, ['a@ivue.dev'], true);
    expect(await Audience.Class.memberships(env, 'a@ivue.dev')).toHaveLength(0);
    expect(await Ledger.Class.historyFor(env, 'a@ivue.dev')).toHaveLength(0);
  });

  it('signupsByDay groups recent signups', async () => {
    const env = makeTestEnv();
    await Audience.Class.enroll(env, 'a@ivue.dev', 'Ada', 'newsletter');
    const days = await Audience.Class.signupsByDay(env, 7);
    expect(days).toHaveLength(1);
    expect(days[0].count).toBe(1);
  });
});
