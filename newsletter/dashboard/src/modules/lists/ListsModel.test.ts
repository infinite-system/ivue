// List-management derivations — guards, hints, and the effective
// schedule narration — all prototype members, no mount needed.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListsModel } from './ListsModel';
import type { AdminSettings } from '../platform/Api';

const SETTINGS = {
  cadenceDays: 2,
  sendHourLocal: 9,
  defaultTimezone: 'America/Toronto',
  listOverrides: { vip: { sendHourLocal: 18 } },
} as AdminSettings;

beforeEach(() => {
  vi.stubGlobal('sessionStorage', {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('[]')),
  );
});

describe('ListsModel derivations', () => {
  it('the default list is protected; delete needs an empty list', () => {
    const model = new ListsModel.Class();
    expect(model.isDefault('newsletter')).toBe(true);
    expect(
      model.canDelete({ list: 'newsletter', members: 0, active: 0 }),
    ).toBe(false);
    expect(model.canDelete({ list: 'vip', members: 3, active: 2 })).toBe(
      false,
    );
    expect(model.canDelete({ list: 'vip', members: 0, active: 0 })).toBe(true);
    expect(
      model.deleteHint({ list: 'newsletter', members: 0, active: 0 }),
    ).toBe('default list');
    expect(model.deleteHint({ list: 'vip', members: 3, active: 2 })).toBe(
      'has members',
    );
    expect(model.deleteHint({ list: 'vip', members: 0, active: 0 })).toBe('');
  });

  it('scheduleLabel shows the effective clock and marks overrides', () => {
    const model = new ListsModel.Class();
    model.settings.value = SETTINGS;
    expect(model.scheduleLabel('newsletter')).toBe('every 2d · 9am local');
    expect(model.scheduleLabel('vip')).toBe('every 2d · 6pm local (override)');
  });

  it('rename flow: start fills the draft, cancel clears, guards disable', () => {
    const model = new ListsModel.Class();
    expect(model.isRenaming('vip')).toBe(false);
    model.startRename('vip');
    expect(model.isRenaming('vip')).toBe(true);
    expect(model.renameDraft.value).toBe('vip');
    expect(model.renameDisabled).toBe(false);
    model.renameDraft.value = '  ';
    expect(model.renameDisabled).toBe(true);
    model.cancelRename();
    expect(model.isRenaming('vip')).toBe(false);
    expect(model.renameDraft.value).toBe('');
  });

  it('createDisabled needs a non-blank draft and no in-flight action', () => {
    const model = new ListsModel.Class();
    expect(model.createDisabled).toBe(true);
    model.createDraft.value = 'insiders';
    expect(model.createDisabled).toBe(false);
    model.busy.value = true;
    expect(model.createDisabled).toBe(true);
  });
});
