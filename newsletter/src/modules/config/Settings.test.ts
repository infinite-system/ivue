import { describe, expect, it } from 'vitest';
import { Settings } from './Settings';
import { makeTestEnv } from '../../../test/TestDatabase';

describe('Settings', () => {
  it('falls back to the env cadence when nothing is stored', async () => {
    const env = makeTestEnv();
    expect(await Settings.Class.cadenceHours(env)).toBe(40);
  });

  it('a stored cadence overrides the env var', async () => {
    const env = makeTestEnv();
    await Settings.Class.setCadenceHours(env, 12);
    expect(await Settings.Class.cadenceHours(env)).toBe(12);
    await Settings.Class.setCadenceHours(env, 72);
    expect(await Settings.Class.cadenceHours(env)).toBe(72);
  });

  it('rejects a cadence outside 1–720 hours', async () => {
    const env = makeTestEnv();
    await expect(Settings.Class.setCadenceHours(env, 0)).rejects.toThrow();
    await expect(Settings.Class.setCadenceHours(env, 1000)).rejects.toThrow();
    await expect(Settings.Class.setCadenceHours(env, NaN)).rejects.toThrow();
  });

  it('a corrupted stored value falls back to the env cadence', async () => {
    const env = makeTestEnv();
    await Settings.Class.write(env, Settings.Class.CADENCE_KEY, 'garbage');
    expect(await Settings.Class.cadenceHours(env)).toBe(40);
  });
});
